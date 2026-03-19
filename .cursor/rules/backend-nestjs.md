# Cursor Rules: NestJS Backend Development

## Project Context

- **Type**: NestJS 11.0.1 Backend API
- **Database**: PostgreSQL + Prisma 7.3.0
- **Architecture**: Feature-led modules (organize by feature, not by technical
  layer)
- **Testing**: Jest (unit) + Supertest (E2E)

---

## Cursor-Specific Features

### Multi-File Editing

When modifying features, Cursor should edit files in logical order:

1. **Prisma schema** (if database changes needed)
2. **DTOs** (input/output validation)
3. **Repository** (data access layer)
4. **Service** (business logic)
5. **Controller** (HTTP routing)
6. **Tests** (unit + E2E)

This order ensures dependencies are created before they're used.

### Symbol Navigation

- Use `Ctrl+Click` (or `Cmd+Click` on Mac) to navigate to definitions
- Feature modules are self-contained (all files in one directory like
  `src/users/`)
- Repositories use Prisma client (from `generated/prisma/client`)
- Services inject repositories via constructor
- Controllers inject services via constructor

### Code Generation Shortcuts

**Generate Feature Module** (use Cursor composer):

**User**: "Generate lessons feature module"

**Cursor should create**:

- Module, Controller, Service, Repository
- DTOs (CreateLessonDto, UpdateLessonDto, LessonResponseDto)
- Basic unit tests
- Follow existing patterns in the codebase

**Generate Tests** (use Cursor):

**User**: Opens service/controller file, requests: "Generate unit test for this
file"

**Cursor should create**:

- `*.spec.ts` file colocated with source
- Mocked dependencies using jest
- AAA pattern (Arrange, Act, Assert)
- Test both success and error cases

---

## Part 1: Core Development Rules

### 1. Feature-Led Architecture (CRITICAL)

Organize by **feature**, NOT by technical layer.

**✅ Correct**:

```
src/
├── users/
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.repository.ts
│   └── users.module.ts
├── lessons/
│   ├── dto/
│   ├── lessons.controller.ts
│   └── ...
```

**❌ Incorrect**:

```
src/
├── controllers/
│   ├── users.controller.ts
│   ├── lessons.controller.ts
├── services/
│   ├── users.service.ts
│   ├── lessons.service.ts
```

**Why?**

- Self-contained modules (easier to understand, modify, delete)
- Clear boundaries (less coupling)
- Team scalability (different teams work on different features)

---

### 2. Variable Naming (7 Principles)

**Reference**: [.agent/rules.md](../../.agent/rules.md) for full details

**Quick checklist**:

- [ ] **Intention-revealing**: `getUserById()` not `getData()`
- [ ] **No disinformation**: `users` (array) not `userList` (if Set)
- [ ] **Meaningful**: `UserEntity` vs `UserDto` (clear distinction)
- [ ] **Pronounceable**: `createdAt` not `crtdAt`
- [ ] **Searchable**: `MAX_RETRY_ATTEMPTS` not magic number
- [ ] **No encodings**: `email` not `strEmail`
- [ ] **No mental mapping**: `user` not `u`

**Backend-Specific Examples**:

```typescript
// ✅ Good
async getUserProfileById(userId: string): Promise<UserResponseDto>
const activeUsers: Set<User> = new Set();
const MAX_LOGIN_ATTEMPTS = 3;

// ❌ Bad
async getData(id: string)
const userList: Set<User> = new Set();
if (attempts > 3)  // Magic number
```

---

### 3. TypeScript Strict Mode

**Always**:

- Explicit return types on functions
- No implicit `any`
- Use `interface` for DTOs
- Readonly properties where immutable

**Example**:

```typescript
// ✅ Good
async findUserById(id: string): Promise<UserResponseDto> {
  const user: User | null = await this.repository.findById(id);
  if (!user) {
    throw new NotFoundException(`User with ID ${id} not found`);
  }
  return this.toDto(user);
}

// ❌ Bad
async findUserById(id) {
  const user = await this.repository.findById(id);
  return user;
}
```

---

### 4. Dependency Injection

**Always use constructor injection**:

```typescript
// ✅ Good
@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly logger: Logger,
  ) {}

  async findById(id: string): Promise<User> {
    this.logger.log(`Finding user ${id}`);
    return this.repository.findById(id);
  }
}

// ❌ Bad
@Injectable()
export class UsersService {
  @Inject()
  private repository: UsersRepository; // Property injection - avoid
}
```

**Why?**

- Makes dependencies explicit
- Enables proper testing (easy to mock)
- TypeScript type checking at instantiation

---

### 5. Repository Pattern

**Data access goes in repositories**:

```typescript
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAll(skip?: number, take?: number): Promise<User[]> {
    return this.prisma.user.findMany({ skip, take });
  }

  async save(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
```

**Separation**:

- **Repository**: Database access (Prisma queries)
- **Service**: Business logic
- **Controller**: HTTP routing

---

### 6. Input Validation

**All DTOs use class-validator**:

```typescript
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsInt()
  @Min(0)
  @Max(150)
  @IsOptional()
  age?: number;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
```

**Global ValidationPipe** in `main.ts`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip unknown properties
    forbidNonWhitelisted: true, // Reject unknown properties
    transform: true, // Transform to DTO class
    transformOptions: {
      enableImplicitConversion: true, // Convert query params
    },
  }),
);
```

---

### 7. Error Handling

**Throw HTTP exceptions from services**:

```typescript
// In service
async findUserById(id: string): Promise<User> {
  const user = await this.repository.findById(id);
  if (!user) {
    throw new NotFoundException(`User with ID ${id} not found`);
  }
  return user;
}

async createUser(dto: CreateUserDto): Promise<User> {
  const existing = await this.repository.findByEmail(dto.email);
  if (existing) {
    throw new ConflictException('Email already in use');
  }
  return this.repository.save(dto);
}

// In controller - let NestJS handle it
@Get(':id')
async findOne(@Param('id') id: string): Promise<UserResponseDto> {
  return this.service.findUserById(id);  // Exception bubbles up
}
```

**Common HTTP Exceptions**:

- `NotFoundException` - 404
- `ConflictException` - 409
- `BadRequestException` - 400
- `UnauthorizedException` - 401
- `ForbiddenException` - 403
- `InternalServerErrorException` - 500

---

## Part 2: Testing with Cursor

### Unit Testing Pattern

Use `Test.createTestingModule()`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(UsersRepository);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await service.findById('1');

      // Assert
      expect(result).toEqual(mockUser);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const dto = { email: 'new@example.com', name: 'New User' };
      const mockUser = {
        id: '1',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repository.findByEmail.mockResolvedValue(null);
      repository.save.mockResolvedValue(mockUser);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toEqual(mockUser);
      expect(repository.save).toHaveBeenCalledWith(dto);
    });

    it('should throw ConflictException when email exists', async () => {
      // Arrange
      const dto = { email: 'existing@example.com', name: 'User' };
      repository.findByEmail.mockResolvedValue({ id: '1' } as any);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });
});
```

---

### E2E Testing Pattern

Test full request/response:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.user.deleteMany();
  });

  describe('POST /users', () => {
    it('should create user - success', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'John', email: 'john@test.com' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('John');
        });
    });

    it('should reject invalid email - validation error', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'John', email: 'invalid-email' })
        .expect(400);
    });

    it('should reject duplicate email - conflict', async () => {
      // Create first user
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'John', email: 'john@test.com' })
        .expect(201);

      // Try to create duplicate
      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Jane', email: 'john@test.com' })
        .expect(409);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'John', email: 'john@test.com' });

      const userId = createResponse.body.id;

      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(userId);
          expect(res.body.email).toBe('john@test.com');
        });
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/non-existent-id')
        .expect(404);
    });
  });
});
```

---

## Part 3: Cursor Workflows

### Workflow 1: Create New Feature

**User request**: "Create lessons feature module"

**Cursor composer should**:

1. **Update Prisma schema**:

   ```prisma
   model Lesson {
     id          String   @id @default(uuid())
     title       String
     description String
     content     String
     difficulty  String
     duration    Int
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt

     @@index([difficulty])
     @@map("lessons")
   }
   ```

2. **Generate migration**: `npx prisma migrate dev --name add_lessons_table`

3. **Create lessons/ directory** with:
   - `lessons.module.ts`
   - `lessons.controller.ts`
   - `lessons.service.ts`
   - `lessons.repository.ts`
   - `dto/create-lesson.dto.ts`
   - `dto/update-lesson.dto.ts`
   - `dto/lesson-response.dto.ts`

4. **Wire up in app.module.ts**

5. **Generate basic tests**:
   - `lessons.service.spec.ts`
   - `lessons.controller.spec.ts`

6. **Follow existing patterns** in codebase

---

### Workflow 2: Add Endpoint to Existing Feature

**User request**: "Add endpoint to filter users by role"

**Cursor should**:

1. **Understand context**: Read existing controller/service
2. **Create DTO** (if new input/output shape needed)
3. **Add repository method** (if database access needed):
   ```typescript
   async findByRole(role: string): Promise<User[]> {
     return this.prisma.user.findMany({ where: { role } });
   }
   ```
4. **Add service method** (business logic):
   ```typescript
   async findByRole(role: string): Promise<User[]> {
     return this.repository.findByRole(role);
   }
   ```
5. **Add controller handler** (route):
   ```typescript
   @Get('by-role/:role')
   async findByRole(@Param('role') role: string): Promise<UserResponseDto[]> {
     return this.service.findByRole(role);
   }
   ```
6. **Write tests** (unit + E2E)

---

### Workflow 3: Modify Database Schema

**User request**: "Add emailVerified field to users"

**Cursor should**:

1. **Update** `prisma/schema.prisma`:

   ```prisma
   model User {
     id            String   @id @default(uuid())
     email         String   @unique
     emailVerified Boolean  @default(false)  // NEW
     // ... other fields
   }
   ```

2. **Generate migration**: `npx prisma migrate dev --name add_email_verified`

3. **Update entities** (TypeScript types):

   ```typescript
   export interface User {
     id: string;
     email: string;
     emailVerified: boolean; // NEW
     // ... other fields
   }
   ```

4. **Update DTOs** (if needed):

   ```typescript
   export interface UserResponseDto {
     id: string;
     email: string;
     emailVerified: boolean; // NEW
     // ... other fields
   }
   ```

5. **Update repository** (if queries affected)
6. **Update tests** (if test data changed)

---

## Part 4: NestJS Best Practices Reference

**Full Technical Rules**:
[.agents/skills/nestjs-best-practices/](.agents/skills/nestjs-best-practices/)

**Critical Rules**:

- [arch-avoid-circular-deps.md](.agents/skills/nestjs-best-practices/rules/arch-avoid-circular-deps.md) -
  Avoid circular dependencies
- [arch-feature-modules.md](.agents/skills/nestjs-best-practices/rules/arch-feature-modules.md) -
  Feature module organization
- [arch-use-repository-pattern.md](.agents/skills/nestjs-best-practices/rules/arch-use-repository-pattern.md) -
  Repository pattern
- [di-constructor-injection.md](.agents/skills/nestjs-best-practices/rules/di-constructor-injection.md) -
  Constructor injection
- [security-validate-all-input.md](.agents/skills/nestjs-best-practices/rules/security-validate-all-input.md) -
  Input validation
- [test-use-testing-module.md](.agents/skills/nestjs-best-practices/rules/test-use-testing-module.md) -
  Unit testing
- [test-e2e-supertest.md](.agents/skills/nestjs-best-practices/rules/test-e2e-supertest.md) -
  E2E testing

**Quick Links by Category**:

- **Architecture**: `.agents/skills/nestjs-best-practices/rules/arch-*.md`
- **Dependency Injection**: `.agents/skills/nestjs-best-practices/rules/di-*.md`
- **Security**: `.agents/skills/nestjs-best-practices/rules/security-*.md`
- **Testing**: `.agents/skills/nestjs-best-practices/rules/test-*.md`
- **Database**: `.agents/skills/nestjs-best-practices/rules/db-*.md`
- **API Design**: `.agents/skills/nestjs-best-practices/rules/api-*.md`

---

## Part 5: Common Patterns

### Controller Pattern

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  async findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
  ): Promise<UserResponseDto[]> {
    return this.service.findAll(skip, take);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.service.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.service.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
```

---

### Service Pattern

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from 'generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly logger: Logger,
  ) {}

  async findAll(skip?: number, take?: number): Promise<User[]> {
    return this.repository.findAll(skip, take);
  }

  async findById(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    // Check for duplicates
    const existing = await this.repository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    return this.repository.save(dto);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    // Ensure user exists
    await this.findById(id);

    // Check for email conflicts
    if (dto.email) {
      const existing = await this.repository.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    return this.repository.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    // Ensure user exists
    await this.findById(id);

    await this.repository.delete(id);
  }
}
```

---

### Repository Pattern

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from 'generated/prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(skip?: number, take?: number): Promise<User[]> {
    return this.prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async save(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }
}
```

---

## Part 6: Key Files

- **Entry**: [src/main.ts](../../../src/main.ts) - Application bootstrap
- **Root Module**: [src/app.module.ts](../../../src/app.module.ts) - Module
  imports
- **Prisma Schema**: [prisma/schema.prisma](../../../prisma/schema.prisma) -
  Database models
- **Environment**: `.env` - Configuration (NOT in git)
- **Master Rules**: [.agent/rules.md](../../.agent/rules.md) - Universal AI
  rules
- **Universal Guide**: [AGENTS.md](../../../AGENTS.md) - Comprehensive guide for
  all AI assistants

---

## Part 7: Development Commands

```bash
# Development
npm run start:dev          # Start with hot-reload

# Testing
npm run test              # Unit tests
npm run test:watch        # Watch mode
npm run test:cov          # Coverage report
npm run test:e2e          # E2E tests

# Database
npx prisma migrate dev    # Create and apply migration
npx prisma studio         # Database GUI
npx prisma generate       # Regenerate Prisma client

# Code Quality
npm run lint              # ESLint check
npm run format            # Prettier format

# Build
npm run build             # Production build
```

---

## Conclusion

These rules are optimized for Cursor's multi-file editing, symbol navigation,
and code generation capabilities. When generating code:

1. Follow feature-led architecture
2. es
3. Use constructor injection
4. Validate all inputs with DTOs
5. Handle errors with HTTP exceptions
6. Write comprehensive tests
7. Reference existing patterns in the codebase

**Happy coding with Cursor! 🚀**
