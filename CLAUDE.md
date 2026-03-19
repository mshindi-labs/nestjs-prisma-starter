# CLAUDE.md - AI Coding Guidelines

**Stack**: NestJS 11.0.1 | PostgreSQL + Prisma 7.3.0 | Jest + Supertest | pnpm

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository. It acts as the ultimate source of truth for architectural, functional, and testing patterns.

## ⚡ Commands

```bash
# Development
pnpm start:dev        # Hot-reload dev server (port 3000 or $PORT)
pnpm build            # Compile TypeScript via nest build
pnpm start:prod       # Run compiled dist/main.js

# Testing
pnpm test             # Unit tests (src/**/*.spec.ts)
pnpm test:watch       # Watch mode
pnpm test:cov         # Coverage report
pnpm test:e2e         # E2E tests (test/**/*.e2e-spec.ts)

# Run a single test file
pnpm test -- --testPathPattern=app.controller

# Database
pnpm prisma migrate dev   # Create and apply migration
pnpm prisma studio        # Database GUI
pnpm prisma generate      # Regenerate client

# Code quality
pnpm lint             # ESLint with auto-fix
pnpm format           # Prettier format
```

## 📐 Project Overview & Key Principles

This is a comprehensive property management API.
- **Architecture**: Modular, domain-driven (Feature-led). Each domain feature lives under `src/` with co-located controller, service, module, DTOs, and tests.
- **Functional Programming**: Mandatory strict adherence to immutability, pure functions, closures, and discriminated unions.
- **Dependency Injection**: Use constructor injection exclusively. Scope providers as `DEFAULT` (singleton).

### Code Organization & Layer Separation

- **Feature-Led (NOT Technical Layer)**: E.g. `src/users/` containing controller, service, repo, dto, tests. Avoid decoupled `src/controllers/` or `src/services/`.
- **Controller** — HTTP layer only; routing logic, no business logic.
- **Service** — Business logic + validation; calls repositories.
- **Repository** — Data access layer; Prisma queries only.
- **Shared Utils**: Decorators, guards, pipes, filters, utils live in `src/common/`.

### Functional Programming Principles (Mandatory)

- **Immutability First:** Embrace immutable architectures. Avoid `let` and prevent mutation. Heavily utilize `Readonly<T>`, `ReadonlyArray<T>`, and standard immutable methods mapping.
- **Pure Functions:** Decouple core business logic into pure functions extracted from side-effects or stateful service instances where possible.
- **Function Composition:** Actively implement higher-order functions (HOFs), closures, and partial application/currying where it enhances reusability and declarative logic.
- **Explicit States:** Make illegal states unrepresentable using Discriminated Unions (like `Result<T, E>` or `Option<T>` patterns).
- **Exhaustive Handling:** Leverage `switch` statements or matchers for strict compile-time exhaustiveness checks over discriminated unions.

### TypeScript Standards

- Strict mode is on (`nodenext` module resolution, `isolatedModules: true`).
- Always declare explicit types for variables, parameters, and return values.
- Avoid `any` type completely.
- Use explicit return types on all public methods.
- Prefer interfaces over types for object definitions.
- Use enums for fixed sets of values.
- Import types with `import type` when possible.

### Naming Principles

- **Intention-revealing**: `getUserById()` not `getData()`.
- **Pronounceable**: `createdAt` not `crtdAt`.
- **Searchable**: `MAX_LOGIN_ATTEMPTS = 3` not magic numbers.
- **No encodings**: `email` not `strEmail`.
- **Conventions**:
  - Files: `kebab-case` (e.g., `user-profile.service.ts`)
  - Classes/Interfaces: `PascalCase`
  - Variables/Methods: `camelCase`
  - Constants: `SCREAMING_SNAKE_CASE`

### Security & Input Validation

- Validate all inputs using `class-validator` decorators on DTOs.
- Extend `PartialType` for update DTOs.
- Create separate DTOs for different operations (create, update, response).
- Validate at the controller boundary; services trust inputs are already validated.
- Global `ValidationPipe` is utilized. Apply guards (`@UseGuards`) for authentication.

### Database & Prisma Patterns

- Use UUID for all primary keys (`@id @default(uuid())`).
- Include audit fields on all models: `created_by`, `updated_by`, `created_at`, `updated_at`.
- Establish proper relations with foreign keys. Use Prisma enums.
- Use transactions for complex operations. 
- Generate client to `generated/prisma/` (not default location).

### Error Handling

- Services throw HTTP exceptions. Use NestJS built-in exceptions (`NotFoundException` 404, `ConflictException` 409, `BadRequestException` 400, `UnauthorizedException` 401).
- Use global exception filters for consistent API error shapes.
- Use `catchError`/`try-catch` when interacting with external I/O.
- Use existing `raiseHttpError` utility.

## 🧠 Procedural Knowledge & `@skills` Integration

This repository leverages the **`@skills` directory** extensively (located in `.agents/skills/`) as the source of truth for programmatic standards.

> **MANDATORY**: Consult the procedural knowledge mapped to these skills *before* generating or refactoring code. Do not hallucinate patterns; read the skill files to fetch the correct patterns and principles.

| Skill                                  | Path                                                       | Procedural Application / When to consult                                                                     |
| -------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Functional TypeScript**              | `.agents/skills/functional-typescript/SKILL.md`            | **Mandatory default.** Functional paradigms, higher-order functions, currying, pure functions, closures.     |
| **TypeScript Best Practices**          | `.agents/skills/typescript-best-practices/SKILL.md`        | Type-first design, making illegal states unrepresentable, discriminated unions, runtime validation guardrails. |
| **TypeScript Expert**                  | `.agents/skills/typescript-expert/SKILL.md`                | Advanced typing, optimizations, and deep language tooling.                                                   |
| **NestJS Best Practices** (index)      | `.agents/skills/nestjs-best-practices/SKILL.md`            | Quick rule-name lookup for architecture, dependency injection, architecture patterns.                        |
| **NestJS Expert**                      | `.agents/skills/nestjs-expert/SKILL.md`                    | Advanced patterns (Auth, microservices, testing edge-cases).                                                 |
| **Testing with Jest**                  | `.agents/skills/javascript-typescript-jest/SKILL.md`       | AAA testing pattern, exact Mock procedures, testing closures & pure functions.                               |
| **Architecture Modules** `arch-*`      | `.agents/skills/nestjs-best-practices/rules/arch-*.md`     | Restructuring modules, dependency avoidance, repository patterns, logic decoupling.                          |
| **Dependency Injection** `di-*`        | `.agents/skills/nestjs-best-practices/rules/di-*.md`       | Constructor injection, provider scopes (singleton/request/transient), injection tokens for interfaces        |
| **Error Handling** `error-*`           | `.agents/skills/nestjs-best-practices/rules/error-*.md`    | Exception filters, throwing HTTP exceptions from services, safe async/background error handling              |
| **Security Standards** `security-*`    | `.agents/skills/nestjs-best-practices/rules/security-*.md` | JWT configurations, DTO validations, guards, and safety bounds.                                              |
| **Performance Patterns** `perf-*`      | `.agents/skills/nestjs-best-practices/rules/perf-*.md`     | DB indexing, async hooks, caching strategies.                                                                |
| **Find Skills Utility**                | `.agents/skills/find-skills/SKILL.md`                      | When looking for an installable capability or new workflow.                                                  |

### How to apply skill rules
1. **Identify the category** of the task (architecture change → `arch-*`, new auth flow → `security-*`, etc.)
2. **Open the matching rule file** and read the _incorrect_ example first — verify the current code doesn't match it.
3. **Generate code that matches the _correct_ example**, adapting to project-specific patterns.

## 🔄 Common Claude Workflows

### Multi-File Edit Order
1. Prisma schema → 2. DTOs → 3. Repository → 4. Service → 5. Controller → 6. Tests

### Feature Generation
**User**: "Generate lessons feature"
**Create**: Module, Controller, Service, Repository, DTOs (Create/Update/Response), Unit tests

### Add Endpoint
1. Repository: `async findByRole(role: string) { return this.prisma.user.findMany({ where: { role } }); }`
2. Service: `async findByRole(role: string) { return this.repository.findByRole(role); }`
3. Controller: `@Get('by-role/:role') async findByRole(@Param('role') role: string) { ... }`
4. Write tests

### Modify Schema
1. Update `prisma/schema.prisma`
2. `pnpm prisma migrate dev --name <description>`
3. Update DTOs/entities and regenerate client (`pnpm prisma generate`)
4. Update tests

## 🧪 Testing Patterns

**Unit tests** (`*.spec.ts`) use `Test.createTestingModule()` with manually mocked dependencies following the AAA (Arrange / Act / Assert) structure.
**E2E tests** (`test/**/*.e2e-spec.ts`) use the real `NestApplication` + Supertest.

### Unit Test (AAA Pattern)
```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: { findById: jest.fn() } },
      ],
    }).compile();
    service = module.get(UsersService);
    repository = module.get(UsersRepository);
  });

  it('should return user when found (Act & Assert)', async () => {
    repository.findById.mockResolvedValue(mockUser); // Arrange
    const result = await service.findById('1'); // Act
    expect(result).toEqual(mockUser); // Assert
  });
});
```

## 📝 Code Templates

### Controller Structure
```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @APICreateResponsesDecorator([{ status: 200, type: UserResponseDto }])
  findAll(@Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number): Promise<UserResponseDto[]> {
    return this.service.findAll(skip);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @User() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.service.create(dto, user.id);
  }
}
```

### Service Structure
```typescript
@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async create(dto: CreateUserDto, userId: string): Promise<User> {
    const existing = await this.repository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email in use');
    
    return this.repository.save({
      ...dto,
      created_by: userId,
      updated_by: userId,
    });
  }
}
```

## 🎯 Checklist for Claude
When generating code:
- [ ] Feature-led structure utilized (`src/feature/`)
- [ ] Followed all 7 Variable Naming Principles
- [ ] Explicit return types implemented without any implicit `any`
- [ ] Functional programming enforced (immutability, logic separation)
- [ ] DTO Validation applied rigorously
- [ ] Input handling bounded by Controller, Business Logic by Service, Queries by Repository
- [ ] Unit + E2E tests authored following the AAA structure
- [ ] Appropriate procedural knowledge from `.agents/skills/` leveraged
