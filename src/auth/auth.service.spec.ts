import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccountsRepository } from './accounts.repository';
import { OtpRepository } from './otp.repository';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { UsersService } from '../users/users.service';
import { AccountType } from 'generated/prisma/client';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('AuthService', () => {
  let service: AuthService;
  let accountsRepository: jest.Mocked<AccountsRepository>;
  let otpRepository: jest.Mocked<OtpRepository>;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test User',
    avatar: null,
    roleId: '123e4567-e89b-12d3-a456-426614174001',
    organizationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    organization: null,
  };

  const mockAccount = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    userId: mockUser.id,
    email: 'test@example.com',
    msisdn: null,
    password: '$2b$10$hashedpassword',
    accountType: AccountType.EMAIL,
    isEmailVerified: false,
    isMsisdnVerified: false,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AccountsRepository,
          useValue: {
            findByEmail: jest.fn(),
            findByMsisdn: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updatePassword: jest.fn(),
            incrementFailedLoginAttempts: jest.fn(),
            resetFailedLoginAttempts: jest.fn(),
          },
        },
        {
          provide: OtpRepository,
          useValue: {
            create: jest.fn(),
            findValidOtp: jest.fn(),
            markAsUsed: jest.fn(),
            invalidateAllByAccountAndType: jest.fn().mockResolvedValue(1),
            findAllValidOtpsByAccountAndType: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: RefreshTokensRepository,
          useValue: {
            create: jest.fn().mockResolvedValue({}),
            findByToken: jest.fn(),
            revokeToken: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BCRYPT_ROUNDS') return 10;
              if (key === 'JWT_SECRET') return 'test-secret';
              if (key === 'JWT_EXPIRES_IN') return '1h';
              return null;
            }),
          },
        },
        {
          provide: ThrottlerGuard,
          useValue: {
            canActivate: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    accountsRepository = module.get(AccountsRepository);
    otpRepository = module.get(OtpRepository);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should create user and account successfully', async () => {
      const signupDto = {
        name: 'New User',
        identifier: 'newuser@example.com',
        msisdn: '+255612345678',
        roleId: 1,
        password: 'Password123',
        accountType: AccountType.EMAIL,
      };

      accountsRepository.findByEmail.mockResolvedValue(null);
      accountsRepository.findByMsisdn.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser as any);
      accountsRepository.create.mockResolvedValue(mockAccount as any);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.signup(signupDto);

      expect(result.accessToken).toBe('jwt-token');
      expect(result.user).toEqual(mockUser);
      expect(accountsRepository.findByEmail).toHaveBeenCalledWith(
        signupDto.identifier,
        false,
      );
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: signupDto.name,
          roleId: signupDto.roleId,
        }),
      );
      expect(accountsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          msisdn: expect.stringContaining('255612345678'),
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      const signupDto = {
        name: 'New User',
        identifier: 'existing@example.com',
        msisdn: '+255612345678',
        roleId: 1,
        password: 'Password123',
        accountType: AccountType.EMAIL,
      };

      accountsRepository.findByEmail.mockResolvedValue(mockAccount as any);

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update existing msisdn-only account when adding email', async () => {
      const signupDto = {
        name: 'Updated Name',
        identifier: 'newemail@example.com',
        msisdn: '+255612345678',
        roleId: 2,
        password: 'Password123',
        accountType: AccountType.EMAIL,
      };

      const msisdnOnlyAccount = {
        ...mockAccount,
        id: 'msisdn-account-id',
        email: null,
        msisdn: '+255612345678',
        accountType: AccountType.MSISDN,
        userId: 999,
        user: { ...mockUser, id: 999, name: 'Old Name', roleId: 1 },
      };

      accountsRepository.findByEmail.mockResolvedValue(null);
      accountsRepository.findByMsisdn.mockResolvedValue(
        msisdnOnlyAccount as any,
      );
      usersService.update.mockResolvedValue(msisdnOnlyAccount.user as any);
      accountsRepository.update.mockResolvedValue({
        ...msisdnOnlyAccount,
        email: signupDto.identifier,
        accountType: AccountType.EMAIL,
      } as any);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.signup(signupDto);

      expect(result.accessToken).toBe('jwt-token');
      expect(usersService.update).toHaveBeenCalledWith(
        999,
        expect.objectContaining({
          name: 'Updated Name',
          roleId: 2,
        }),
      );
      expect(accountsRepository.update).toHaveBeenCalledWith(
        'msisdn-account-id',
        expect.objectContaining({
          email: 'newemail@example.com',
          accountType: AccountType.EMAIL,
        }),
      );
      expect(usersService.create).not.toHaveBeenCalled();
      expect(accountsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        identifier: 'test@example.com',
        password: 'Password123',
      };

      accountsRepository.findByEmail.mockResolvedValue(mockAccount as any);
      jwtService.sign.mockReturnValue('jwt-token');

      // Mock bcrypt.compare
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('jwt-token');
      expect(result.user).toEqual(mockUser);
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const loginDto = {
        identifier: 'test@example.com',
        password: 'WrongPassword',
      };

      accountsRepository.findByEmail.mockResolvedValue(mockAccount as any);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if account not found', async () => {
      const loginDto = {
        identifier: 'notfound@example.com',
        password: 'Password123',
      };

      accountsRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      const loginDto = {
        identifier: 'test@example.com',
        password: 'Password123',
      };
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);

      accountsRepository.findByEmail.mockResolvedValue({
        ...mockAccount,
        lockedUntil: futureDate,
        failedLoginAttempts: 5,
      } as any);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Too many failed attempts. Try again later.'),
      );
    });

    it('should call incrementFailedLoginAttempts on invalid password', async () => {
      const loginDto = {
        identifier: 'test@example.com',
        password: 'WrongPassword',
      };

      accountsRepository.findByEmail.mockResolvedValue(mockAccount as any);
      accountsRepository.incrementFailedLoginAttempts.mockResolvedValue(
        undefined,
      );
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(
        accountsRepository.incrementFailedLoginAttempts,
      ).toHaveBeenCalledWith(mockAccount.id);
    });

    it('should call resetFailedLoginAttempts on successful login', async () => {
      const loginDto = {
        identifier: 'test@example.com',
        password: 'Password123',
      };

      accountsRepository.findByEmail.mockResolvedValue(mockAccount as any);
      accountsRepository.resetFailedLoginAttempts.mockResolvedValue(undefined);
      jwtService.sign.mockReturnValue('jwt-token');
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);

      await service.login(loginDto);

      expect(accountsRepository.resetFailedLoginAttempts).toHaveBeenCalledWith(
        mockAccount.id,
      );
    });

    it('should auto-clear expired lockout and proceed with login', async () => {
      const loginDto = {
        identifier: 'test@example.com',
        password: 'Password123',
      };
      const pastDate = new Date(Date.now() - 60 * 1000);

      accountsRepository.findByEmail.mockResolvedValue({
        ...mockAccount,
        lockedUntil: pastDate,
        failedLoginAttempts: 5,
      } as any);
      accountsRepository.resetFailedLoginAttempts.mockResolvedValue(undefined);
      jwtService.sign.mockReturnValue('jwt-token');
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(accountsRepository.resetFailedLoginAttempts).toHaveBeenCalled();
      expect(result.accessToken).toBe('jwt-token');
    });
  });

  describe('resendOtp', () => {
    const resendOtpDto = {
      identifier: 'test@example.com',
      accountType: AccountType.EMAIL,
    };

    it('should invalidate existing OTPs and issue a new one', async () => {
      accountsRepository.findByEmail.mockResolvedValue(mockAccount as any);
      otpRepository.invalidateAllByAccountAndType.mockResolvedValue(1);
      otpRepository.create.mockResolvedValue({} as any);

      const result = await service.resendOtp(resendOtpDto);

      expect(result).toEqual({
        message: 'If the account exists, an OTP has been sent',
      });

      expect(otpRepository.invalidateAllByAccountAndType).toHaveBeenCalledWith(
        mockAccount.id,
        'LOGIN',
      );

      expect(otpRepository.create).toHaveBeenCalled();
    });

    it('should return generic message when account does not exist', async () => {
      accountsRepository.findByEmail.mockResolvedValue(null);

      const result = await service.resendOtp(resendOtpDto);

      expect(result).toEqual({
        message: 'If the account exists, an OTP has been sent',
      });

      expect(
        otpRepository.invalidateAllByAccountAndType,
      ).not.toHaveBeenCalled();

      expect(otpRepository.create).not.toHaveBeenCalled();
    });

    it('should return generic message when account is inactive', async () => {
      accountsRepository.findByEmail.mockResolvedValue({
        ...mockAccount,
        isActive: false,
      } as any);

      const result = await service.resendOtp(resendOtpDto);

      expect(result).toEqual({
        message: 'If the account exists, an OTP has been sent',
      });

      expect(
        otpRepository.invalidateAllByAccountAndType,
      ).not.toHaveBeenCalled();

      expect(otpRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should return authorized user for valid payload', async () => {
      const payload = {
        sub: mockUser.id,
        accountId: mockAccount.id,
        email: 'test@example.com',
      };

      usersService.findById.mockResolvedValue(mockUser as any);
      accountsRepository.findById.mockResolvedValue(mockAccount as any);

      const result = await service.validateUser(payload);

      expect(result.userId).toBe(mockUser.id);
      expect(result.accountId).toBe(mockAccount.id);
      expect(result.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException for invalid payload', async () => {
      const payload = {
        sub: 'invalid-id',
        accountId: 'invalid-account-id',
      };

      usersService.findById.mockResolvedValue(null);

      await expect(service.validateUser(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
