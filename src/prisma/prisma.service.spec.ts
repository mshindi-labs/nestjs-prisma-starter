import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await service.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect to database on module init', async () => {
    const connectSpy = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalled();
  });

  it('should disconnect from database on module destroy', async () => {
    const disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('should throw error when cleaning database in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    await expect(service.cleanDatabase()).rejects.toThrow(
      'Cannot clean database in production',
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should enable query logging', () => {
    const onSpy = jest.spyOn(service, '$on');

    service.enableQueryLogging();

    expect(onSpy).toHaveBeenCalledWith('query', expect.any(Function));
  });

  it('should disable query logging', () => {
    const onSpy = jest.spyOn(service, '$on');

    service.disableQueryLogging();

    expect(onSpy).toHaveBeenCalledWith('query', expect.any(Function));
  });
});
