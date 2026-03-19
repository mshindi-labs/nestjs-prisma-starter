import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;
  let prisma: jest.Mocked<PrismaService>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByRoleId: jest.fn(),
            findByOrganizationId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            roles: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
            organization: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(UsersRepository);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      repository.findById.mockResolvedValue(mockUser as any);

      const result = await service.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(repository.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const users = [mockUser];
      repository.findAll.mockResolvedValue(users as any);

      const result = await service.findAll(0, 20);

      expect(result).toEqual(users);
      expect(repository.findAll).toHaveBeenCalledWith(0, 20);
    });
  });

  describe('create', () => {
    it('should create user with provided roleId', async () => {
      const createDto = {
        name: 'New User',
        roleId: mockUser.roleId,
      };
      (prisma.roles.findUnique as jest.Mock).mockResolvedValue(mockUser.role);
      repository.create.mockResolvedValue(mockUser as any);

      const result = await service.create(createDto);

      expect(result).toEqual(mockUser);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('should use default role when roleId not provided', async () => {
      const createDto = { name: 'New User' };
      (prisma.roles.findFirst as jest.Mock).mockResolvedValue(mockUser.role);
      repository.create.mockResolvedValue(mockUser as any);

      await service.create(createDto);

      expect(prisma.roles.findFirst).toHaveBeenCalledWith({
        where: { name: 'student' },
      });
    });

    it('should throw BadRequestException when default role not found', async () => {
      const createDto = { name: 'New User' };
      (prisma.roles.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when roleId does not exist', async () => {
      const createDto = { name: 'New User', roleId: 'invalid-role-id' };
      (prisma.roles.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updateDto = { name: 'Updated Name' };
      repository.findById.mockResolvedValue(mockUser as any);
      repository.update.mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      } as any);

      const result = await service.update(mockUser.id, updateDto);

      expect(result.name).toBe('Updated Name');
      expect(repository.update).toHaveBeenCalledWith(mockUser.id, updateDto);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('invalid-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      repository.findById.mockResolvedValue(mockUser as any);
      repository.delete.mockResolvedValue(undefined);

      await service.remove(mockUser.id);

      expect(repository.delete).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
