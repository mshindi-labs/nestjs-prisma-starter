# Pagination Service - Quick Start Example

This is a quick reference guide for implementing pagination in a new feature module.

## Step-by-Step Implementation

### Step 1: Controller Setup

```typescript
// src/your-feature/your-feature.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { YourFeatureService } from './your-feature.service';
import { YourEntityResponseDto } from './dto/your-entity-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginationResponse } from '../common/dto/paginated-response.dto';

@ApiTags('Your Feature')
@Controller('your-feature')
export class YourFeatureController {
  constructor(private readonly service: YourFeatureService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all items',
    description: 'Retrieve a paginated list of all items',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        records: {
          type: 'array',
          items: { $ref: '#/components/schemas/YourEntityResponseDto' },
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
  ): Promise<PaginationResponse<YourEntityResponseDto>> {
    return this.service.findAll(paginationQuery.page, paginationQuery.size);
  }
}
```

### Step 2: Service Setup

```typescript
// src/your-feature/your-feature.service.ts
import { Injectable } from '@nestjs/common';
import { YourFeatureRepository } from './your-feature.repository';
import { YourEntity } from 'generated/prisma/client';
import { PaginationService } from '../common/services/pagination.service';
import { PaginationResponse } from '../common/dto/paginated-response.dto';
import { raiseHttpError } from '../common/utils/raise-http-error';

@Injectable()
export class YourFeatureService {
  constructor(
    private readonly repository: YourFeatureRepository,
    private readonly paginationService: PaginationService,
  ) {}

  async findAll(
    page?: number,
    size?: number,
  ): Promise<PaginationResponse<YourEntity>> {
    try {
      return await this.paginationService.paginate({
        page,
        size,
        dataFetcher: (skip, take) => this.repository.findAll(skip, take),
        countFetcher: () => this.repository.count(),
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }
}
```

### Step 3: Repository Setup

```typescript
// src/your-feature/your-feature.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YourEntity } from 'generated/prisma/client';
import { raiseHttpError } from '../common/utils/raise-http-error';

@Injectable()
export class YourFeatureRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(skip?: number, take?: number): Promise<YourEntity[]> {
    try {
      return await this.prisma.yourEntity.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }

  async count(): Promise<number> {
    try {
      return await this.prisma.yourEntity.count();
    } catch (error) {
      raiseHttpError(error as unknown);
    }
  }
}
```

## Example with Filtering

### Controller with Filter

```typescript
@Get('by-status/:status')
@ApiOperation({
  summary: 'Get items by status',
  description: 'Retrieve a paginated list of items filtered by status',
})
@ApiParam({
  name: 'status',
  type: String,
  description: 'Status to filter by',
  example: 'active',
})
@ApiResponse({
  status: 200,
  description: 'Paginated filtered list retrieved successfully',
  schema: {
    type: 'object',
    properties: {
      records: {
        type: 'array',
        items: { $ref: '#/components/schemas/YourEntityResponseDto' },
      },
      page: { type: 'number', example: 1 },
      size: { type: 'number', example: 20 },
      count: { type: 'number', example: 50 },
      pages: { type: 'number', example: 3 },
    },
  },
})
async findByStatus(
  @Param('status') status: string,
  @Query() paginationQuery: PaginationQueryDto,
): Promise<PaginationResponse<YourEntityResponseDto>> {
  return this.service.findByStatus(
    status,
    paginationQuery.page,
    paginationQuery.size,
  );
}
```

### Service with Filter

```typescript
async findByStatus(
  status: string,
  page?: number,
  size?: number,
): Promise<PaginationResponse<YourEntity>> {
  try {
    return await this.paginationService.paginate({
      page,
      size,
      dataFetcher: (skip, take) =>
        this.repository.findByStatus(status, skip, take),
      countFetcher: () => this.repository.countByStatus(status),
    });
  } catch (error) {
    raiseHttpError(error as unknown);
  }
}
```

### Repository with Filter

```typescript
async findByStatus(
  status: string,
  skip?: number,
  take?: number,
): Promise<YourEntity[]> {
  try {
    return await this.prisma.yourEntity.findMany({
      where: { status },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    raiseHttpError(error as unknown);
  }
}

async countByStatus(status: string): Promise<number> {
  try {
    return await this.prisma.yourEntity.count({
      where: { status },
    });
  } catch (error) {
    raiseHttpError(error as unknown);
  }
}
```

## API Usage Examples

### Basic Request

```bash
# Get first page with default size (20)
GET /your-feature

# Get specific page with default size
GET /your-feature?page=2

# Get first page with custom size
GET /your-feature?size=50

# Get specific page with custom size
GET /your-feature?page=3&size=10
```

### Response Format

```json
{
  "records": [
    {
      "id": 1,
      "name": "Item 1",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Item 2",
      "createdAt": "2024-01-02T00:00:00.000Z"
    }
  ],
  "page": 1,
  "size": 20,
  "count": 100,
  "pages": 5
}
```

## Common Patterns

### Pattern 1: Simple List

```typescript
// Just return all records with pagination
async findAll(page?: number, size?: number) {
  return this.paginationService.paginate({
    page,
    size,
    dataFetcher: (skip, take) => this.repository.findAll(skip, take),
    countFetcher: () => this.repository.count(),
  });
}
```

### Pattern 2: Filtered List

```typescript
// Filter by a single field
async findByCategory(categoryId: number, page?: number, size?: number) {
  return this.paginationService.paginate({
    page,
    size,
    dataFetcher: (skip, take) =>
      this.repository.findByCategory(categoryId, skip, take),
    countFetcher: () => this.repository.countByCategory(categoryId),
  });
}
```

### Pattern 3: Search

```typescript
// Search with text query
async search(query: string, page?: number, size?: number) {
  return this.paginationService.paginate({
    page,
    size,
    dataFetcher: (skip, take) => this.repository.search(query, skip, take),
    countFetcher: () => this.repository.countSearch(query),
  });
}
```

### Pattern 4: Multiple Filters

```typescript
// Multiple filter parameters
async findFiltered(
  filters: { status?: string; category?: string },
  page?: number,
  size?: number,
) {
  return this.paginationService.paginate({
    page,
    size,
    dataFetcher: (skip, take) =>
      this.repository.findFiltered(filters, skip, take),
    countFetcher: () => this.repository.countFiltered(filters),
  });
}
```

## Testing Example

```typescript
// your-feature.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { YourFeatureService } from './your-feature.service';
import { YourFeatureRepository } from './your-feature.repository';
import { PaginationService } from '../common/services/pagination.service';

describe('YourFeatureService', () => {
  let service: YourFeatureService;
  let repository: jest.Mocked<YourFeatureRepository>;
  let paginationService: PaginationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourFeatureService,
        PaginationService,
        {
          provide: YourFeatureRepository,
          useValue: {
            findAll: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<YourFeatureService>(YourFeatureService);
    repository = module.get(YourFeatureRepository);
    paginationService = module.get<PaginationService>(PaginationService);
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      repository.findAll.mockResolvedValue(mockData);
      repository.count.mockResolvedValue(100);

      const result = await service.findAll(1, 20);

      expect(result).toEqual({
        records: mockData,
        page: 1,
        size: 20,
        count: 100,
        pages: 5,
      });

      expect(repository.findAll).toHaveBeenCalledWith(0, 20);
      expect(repository.count).toHaveBeenCalled();
    });
  });
});
```

## Checklist for New Implementation

- [ ] Import `PaginationService` in service constructor
- [ ] Import `PaginationQueryDto` in controller
- [ ] Import `PaginationResponse` type
- [ ] Update controller method to use `@Query() paginationQuery: PaginationQueryDto`
- [ ] Update service method to return `Promise<PaginationResponse<T>>`
- [ ] Call `paginationService.paginate()` with data and count fetchers
- [ ] Ensure repository has `count()` method (or filtered count method)
- [ ] Add Swagger documentation with pagination response schema
- [ ] Test the endpoint
- [ ] Update any frontend code to use new response format

## Tips

1. **Always provide a count fetcher** for better UX
2. **Use consistent ordering** in repository queries
3. **Add indexes** to columns used in `orderBy` and `where`
4. **Document your endpoints** with Swagger decorators
5. **Handle errors** with try-catch and `raiseHttpError`
6. **Keep repositories simple** - just data access, no business logic
7. **Test your implementation** with unit and E2E tests

## Need Help?

- See full documentation: `/src/common/services/README.md`
- Check working examples: `/src/users/` or `/src/course-reviews/`
- Review implementation summary: `/PAGINATION_IMPLEMENTATION.md`
