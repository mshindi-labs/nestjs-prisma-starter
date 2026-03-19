# Pagination Service

A global, reusable pagination service for the Mtoto Learn API that provides consistent pagination across all endpoints.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Overview

The `PaginationService` provides a standardized way to handle pagination across the application. It converts page-based pagination (page/size) to offset-based pagination (skip/take) that Prisma uses, and returns responses in a consistent format.

### Key Benefits

- **Consistency**: All paginated endpoints return the same response structure
- **Type Safety**: Full TypeScript support with generics
- **Flexibility**: Customizable page sizes and maximum limits
- **Swagger Compatible**: Works seamlessly with OpenAPI documentation
- **Easy to Use**: Simple, intuitive API

## Features

- ✅ Page-based pagination (page/size) instead of offset-based (skip/take)
- ✅ Automatic calculation of total pages
- ✅ Configurable default and maximum page sizes
- ✅ Optional total count fetching
- ✅ Input validation and normalization
- ✅ Full TypeScript support with generics
- ✅ Comprehensive JSDoc documentation
- ✅ Swagger/OpenAPI compatible

## Installation

The `PaginationService` is automatically available throughout the application via the `CommonModule`, which is marked as `@Global()`. No additional imports are needed in feature modules.

```typescript
// In your service constructor
constructor(
  private readonly repository: YourRepository,
  private readonly paginationService: PaginationService,
) {}
```

## Basic Usage

### 1. In Your Controller

Use the `PaginationQueryDto` to validate and parse query parameters:

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto, PaginationResponse } from '../common/dto';
import { YourService } from './your.service';
import { YourEntity } from './entities/your.entity';

@Controller('your-resource')
export class YourController {
  constructor(private readonly service: YourService) {}

  @Get()
  @ApiOperation({ summary: 'Get all resources' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        records: {
          type: 'array',
          items: { $ref: '#/components/schemas/YourEntity' },
        },
        page: { type: 'number', example: 1 },
        size: { type: 'number', example: 20 },
        count: { type: 'number', example: 100 },
        pages: { type: 'number', example: 5 },
      },
    },
  })
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginationResponse<YourEntity>> {
    return this.service.findAll(paginationQuery.page, paginationQuery.size);
  }
}
```

### 2. In Your Service

Use the `paginate` method to fetch and paginate data:

```typescript
import { Injectable } from '@nestjs/common';
import { PaginationService, PaginationResponse } from '../common';
import { YourRepository } from './your.repository';
import { YourEntity } from './entities/your.entity';

@Injectable()
export class YourService {
  constructor(
    private readonly repository: YourRepository,
    private readonly paginationService: PaginationService,
  ) {}

  async findAll(
    page?: number,
    size?: number,
  ): Promise<PaginationResponse<YourEntity>> {
    return this.paginationService.paginate({
      page,
      size,
      dataFetcher: (skip, take) => this.repository.findAll(skip, take),
      countFetcher: () => this.repository.count(),
    });
  }
}
```

### 3. In Your Repository

Ensure your repository methods accept `skip` and `take` parameters:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YourEntity } from './entities/your.entity';

@Injectable()
export class YourRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(skip?: number, take?: number): Promise<YourEntity[]> {
    return this.prisma.yourEntity.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(): Promise<number> {
    return this.prisma.yourEntity.count();
  }
}
```

## Advanced Usage

### Pagination with Filtering

```typescript
async findByStatus(
  status: string,
  page?: number,
  size?: number,
): Promise<PaginationResponse<Order>> {
  return this.paginationService.paginate({
    page,
    size,
    dataFetcher: (skip, take) =>
      this.repository.findByStatus(status, skip, take),
    countFetcher: () => this.repository.countByStatus(status),
  });
}
```

### Pagination without Total Count

If you don't need the total count (for performance reasons), omit the `countFetcher`:

```typescript
async findRecent(
  page?: number,
  size?: number,
): Promise<PaginationResponse<Post>> {
  return this.paginationService.paginate({
    page,
    size,
    dataFetcher: (skip, take) => this.repository.findRecent(skip, take),
    // No countFetcher - pages will be undefined in response
  });
}
```

### Custom Page Size Limits

```typescript
async findAllWithCustomLimit(
  page?: number,
  size?: number,
): Promise<PaginationResponse<User>> {
  return this.paginationService.paginate({
    page,
    size,
    defaultSize: 50,  // Custom default
    maxSize: 200,     // Custom maximum
    dataFetcher: (skip, take) => this.repository.findAll(skip, take),
    countFetcher: () => this.repository.count(),
  });
}
```

### Using Helper Methods

#### Convert Page/Size to Skip/Take

```typescript
const { skip, take } = this.paginationService.pageToSkipTake(2, 10);
// Returns: { skip: 10, take: 10 }

const users = await this.repository.findAll(skip, take);
```

#### Calculate Pagination Metadata

```typescript
const metadata = this.paginationService.calculatePaginationMetadata(2, 10, 100);
// Returns: {
//   skip: 10,
//   take: 10,
//   page: 2,
//   size: 10,
//   pages: 10,
//   totalCount: 100
// }
```

## API Reference

### PaginationService

#### `paginate<T>(options: PaginationOptions<T>): Promise<PaginationResponse<T>>`

Main pagination method that fetches and paginates data.

**Parameters:**

- `options.page` (optional): Current page number (1-indexed). Default: 1
- `options.size` (optional): Number of records per page. Default: 20
- `options.dataFetcher` (required): Function that fetches data with skip/take
- `options.countFetcher` (optional): Function that returns total count
- `options.defaultSize` (optional): Custom default page size. Default: 20
- `options.maxSize` (optional): Custom maximum page size. Default: 100

**Returns:**

```typescript
{
  records: T[];      // Array of records for current page
  page: number;      // Current page number
  size: number;      // Number of records per page
  count: number;     // Total count of all records
  pages?: number;    // Total number of pages (only if countFetcher provided)
}
```

#### `pageToSkipTake(page?: number, size?: number): { skip: number; take: number }`

Converts page-based parameters to skip/take format.

**Parameters:**

- `page` (optional): Page number (1-indexed). Default: 1
- `size` (optional): Page size. Default: 20

**Returns:**

```typescript
{
  skip: number; // Number of records to skip
  take: number; // Number of records to take
}
```

#### `calculatePaginationMetadata(page?: number, size?: number, totalCount: number)`

Calculates pagination metadata without fetching data.

**Parameters:**

- `page` (optional): Page number (1-indexed). Default: 1
- `size` (optional): Page size. Default: 20
- `totalCount` (required): Total number of records

**Returns:**

```typescript
{
  skip: number; // Number of records to skip
  take: number; // Number of records to take
  page: number; // Normalized page number
  size: number; // Normalized page size
  pages: number; // Total number of pages
  totalCount: number; // Total count of records
}
```

#### `getDefaultSize(): number`

Returns the default page size (20).

#### `getMaxSize(): number`

Returns the maximum page size (100).

### PaginationQueryDto

DTO for validating pagination query parameters.

**Properties:**

- `page` (optional): Page number (1-10000). Default: 1
- `size` (optional): Page size (1-100). Default: 20

**Validation:**

- Both fields must be integers
- `page` must be between 1 and 10000
- `size` must be between 1 and 100

**Usage in Controller:**

```typescript
@Get()
async findAll(@Query() paginationQuery: PaginationQueryDto) {
  return this.service.findAll(paginationQuery.page, paginationQuery.size);
}
```

### PaginationResponse<T>

Response interface for paginated data.

```typescript
interface PaginationResponse<T> {
  records: T[]; // Array of records
  page: number; // Current page number
  size: number; // Records per page
  count: number; // Total count
  pages?: number; // Total pages (optional)
}
```

## Examples

### Example 1: Basic Pagination

```typescript
// Controller
@Get()
async findAll(@Query() paginationQuery: PaginationQueryDto) {
  return this.service.findAll(paginationQuery.page, paginationQuery.size);
}

// Service
async findAll(page?: number, size?: number): Promise<PaginationResponse<User>> {
  return this.paginationService.paginate({
    page,
    size,
    dataFetcher: (skip, take) => this.repository.findAll(skip, take),
    countFetcher: () => this.repository.count(),
  });
}

// Repository
async findAll(skip?: number, take?: number): Promise<User[]> {
  return this.prisma.user.findMany({ skip, take });
}

async count(): Promise<number> {
  return this.prisma.user.count();
}
```

**Request:**

```
GET /users?page=2&size=10
```

**Response:**

```json
{
  "records": [...],
  "page": 2,
  "size": 10,
  "count": 100,
  "pages": 10
}
```

### Example 2: Filtered Pagination

```typescript
// Controller
@Get('course/:course_id')
async findByCourseId(
  @Param('course_id', ParseIntPipe) courseId: number,
  @Query() paginationQuery: PaginationQueryDto,
) {
  return this.service.findByCourseId(
    courseId,
    paginationQuery.page,
    paginationQuery.size,
  );
}

// Service
async findByCourseId(
  courseId: number,
  page?: number,
  size?: number,
): Promise<PaginationResponse<Review>> {
  // Verify course exists
  const course = await this.prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new NotFoundException(`Course with ID ${courseId} not found`);
  }

  return this.paginationService.paginate({
    page,
    size,
    dataFetcher: (skip, take) =>
      this.repository.findByCourseId(courseId, skip, take),
    countFetcher: () => this.repository.countByCourse(courseId),
  });
}

// Repository
async findByCourseId(
  courseId: number,
  skip?: number,
  take?: number,
): Promise<Review[]> {
  return this.prisma.review.findMany({
    where: { courseId },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}

async countByCourse(courseId: number): Promise<number> {
  return this.prisma.review.count({ where: { courseId } });
}
```

**Request:**

```
GET /reviews/course/123?page=1&size=20
```

**Response:**

```json
{
  "records": [...],
  "page": 1,
  "size": 20,
  "count": 45,
  "pages": 3
}
```

### Example 3: Search with Pagination

```typescript
// Controller
@Get('search')
async search(
  @Query('q') query: string,
  @Query() paginationQuery: PaginationQueryDto,
) {
  return this.service.search(query, paginationQuery.page, paginationQuery.size);
}

// Service
async search(
  query: string,
  page?: number,
  size?: number,
): Promise<PaginationResponse<Product>> {
  return this.paginationService.paginate({
    page,
    size,
    dataFetcher: (skip, take) =>
      this.repository.search(query, skip, take),
    countFetcher: () => this.repository.countSearch(query),
  });
}

// Repository
async search(query: string, skip?: number, take?: number): Promise<Product[]> {
  return this.prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    skip,
    take,
  });
}

async countSearch(query: string): Promise<number> {
  return this.prisma.product.count({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
  });
}
```

## Best Practices

### 1. Always Provide Count Fetcher

For better UX, always provide a `countFetcher` so clients know the total number of pages:

```typescript
// ✅ Good
return this.paginationService.paginate({
  page,
  size,
  dataFetcher: (skip, take) => this.repository.findAll(skip, take),
  countFetcher: () => this.repository.count(),
});

// ❌ Avoid (unless you have a good reason)
return this.paginationService.paginate({
  page,
  size,
  dataFetcher: (skip, take) => this.repository.findAll(skip, take),
});
```

### 2. Use PaginationQueryDto in Controllers

Always use `PaginationQueryDto` for automatic validation:

```typescript
// ✅ Good
@Get()
async findAll(@Query() paginationQuery: PaginationQueryDto) {
  return this.service.findAll(paginationQuery.page, paginationQuery.size);
}

// ❌ Avoid
@Get()
async findAll(
  @Query('page') page?: number,
  @Query('size') size?: number,
) {
  return this.service.findAll(page, size);
}
```

### 3. Add Proper Swagger Documentation

Document your paginated endpoints properly:

```typescript
@Get()
@ApiOperation({ summary: 'Get all resources' })
@ApiResponse({
  status: 200,
  description: 'Paginated list retrieved successfully',
  schema: {
    type: 'object',
    properties: {
      records: { type: 'array', items: { $ref: '#/components/schemas/YourEntity' } },
      page: { type: 'number', example: 1 },
      size: { type: 'number', example: 20 },
      count: { type: 'number', example: 100 },
      pages: { type: 'number', example: 5 },
    },
  },
})
async findAll(@Query() paginationQuery: PaginationQueryDto) {
  // ...
}
```

### 4. Keep Repository Methods Simple

Repository methods should only handle data access:

```typescript
// ✅ Good - Simple data access
async findAll(skip?: number, take?: number): Promise<User[]> {
  return this.prisma.user.findMany({
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}

// ❌ Avoid - Business logic in repository
async findAll(page?: number, size?: number): Promise<User[]> {
  const skip = (page - 1) * size; // This should be in service
  return this.prisma.user.findMany({ skip, take: size });
}
```

### 5. Handle Errors Gracefully

Always wrap pagination calls in try-catch:

```typescript
async findAll(page?: number, size?: number): Promise<PaginationResponse<User>> {
  try {
    return await this.paginationService.paginate({
      page,
      size,
      dataFetcher: (skip, take) => this.repository.findAll(skip, take),
      countFetcher: () => this.repository.count(),
    });
  } catch (error) {
    raiseHttpError(error);
  }
}
```

### 6. Use Consistent Ordering

Always specify an `orderBy` in your repository methods:

```typescript
// ✅ Good - Consistent ordering
async findAll(skip?: number, take?: number): Promise<User[]> {
  return this.prisma.user.findMany({
    skip,
    take,
    orderBy: { createdAt: 'desc' }, // Consistent order
  });
}

// ❌ Avoid - No ordering (unpredictable results)
async findAll(skip?: number, take?: number): Promise<User[]> {
  return this.prisma.user.findMany({ skip, take });
}
```

### 7. Consider Performance

For large datasets, add indexes to columns used in `orderBy` and `where` clauses:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  createdAt DateTime @default(now())

  @@index([createdAt]) // Index for ordering
}
```

## Migration Guide

If you're migrating from skip/take to page/size:

### Before (skip/take)

```typescript
// Controller
@Get()
async findAll(
  @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
  @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
) {
  return this.service.findAll(skip, take);
}

// Service
async findAll(skip?: number, take?: number): Promise<User[]> {
  return this.repository.findAll(skip, take);
}
```

### After (page/size)

```typescript
// Controller
@Get()
async findAll(@Query() paginationQuery: PaginationQueryDto) {
  return this.service.findAll(paginationQuery.page, paginationQuery.size);
}

// Service
async findAll(page?: number, size?: number): Promise<PaginationResponse<User>> {
  return this.paginationService.paginate({
    page,
    size,
    dataFetcher: (skip, take) => this.repository.findAll(skip, take),
    countFetcher: () => this.repository.count(),
  });
}

// Repository (no changes needed)
async findAll(skip?: number, take?: number): Promise<User[]> {
  return this.prisma.user.findMany({ skip, take });
}
```

## Troubleshooting

### Issue: "PaginationService not found"

**Solution:** Ensure `CommonModule` is imported in `app.module.ts`:

```typescript
@Module({
  imports: [
    CommonModule, // Add this
    // ... other modules
  ],
})
export class AppModule {}
```

### Issue: "Validation fails for page/size"

**Solution:** Ensure you're using `PaginationQueryDto`:

```typescript
@Get()
async findAll(@Query() paginationQuery: PaginationQueryDto) {
  // ...
}
```

### Issue: "Pages is undefined in response"

**Solution:** Provide a `countFetcher`:

```typescript
return this.paginationService.paginate({
  page,
  size,
  dataFetcher: (skip, take) => this.repository.findAll(skip, take),
  countFetcher: () => this.repository.count(), // Add this
});
```

## License

This service is part of the Mtoto Learn API project.
