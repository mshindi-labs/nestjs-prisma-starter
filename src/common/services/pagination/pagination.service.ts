import { Injectable } from '@nestjs/common';
import { PaginationResponse } from '../../dto/paginated-response.dto';

/**
 * Options for configuring pagination behavior.
 */
export interface PaginationOptions<T> {
  /**
   * The current page number (1-indexed).
   * @default 1
   */
  page?: number;

  /**
   * The number of records to return per page.
   * @default 20
   */
  size?: number;

  /**
   * Function that fetches the data for the current page.
   * Receives skip (offset) and take (limit) parameters.
   *
   * @param skip - Number of records to skip (offset)
   * @param take - Number of records to take (limit)
   * @returns Promise resolving to an array of records
   *
   * @example
   * dataFetcher: (skip, take) => this.prisma.user.findMany({ skip, take })
   */
  dataFetcher: (skip: number, take: number) => Promise<T[]>;

  /**
   * Optional function that returns the total count of records.
   * If not provided, the `pages` field in the response will be undefined.
   *
   * @returns Promise resolving to the total count of records
   *
   * @example
   * countFetcher: () => this.prisma.user.count()
   */
  countFetcher?: () => Promise<number>;

  /**
   * Optional default page size if not specified.
   * @default 20
   */
  defaultSize?: number;

  /**
   * Optional maximum page size allowed.
   * @default 100
   */
  maxSize?: number;
}

/**
 * Service for handling pagination logic across the application.
 * Provides a consistent pagination interface with customizable options.
 *
 * @example
 * // Basic usage in a service:
 * constructor(private readonly paginationService: PaginationService) {}
 *
 * async findAll(page?: number, size?: number): Promise<PaginationResponse<User>> {
 *   return this.paginationService.paginate({
 *     page,
 *     size,
 *     dataFetcher: (skip, take) => this.repository.findAll(skip, take),
 *     countFetcher: () => this.repository.count(),
 *   });
 * }
 *
 * @example
 * // With filtering:
 * async findByStatus(
 *   status: string,
 *   page?: number,
 *   size?: number,
 * ): Promise<PaginationResponse<Order>> {
 *   return this.paginationService.paginate({
 *     page,
 *     size,
 *     dataFetcher: (skip, take) =>
 *       this.repository.findByStatus(status, skip, take),
 *     countFetcher: () => this.repository.countByStatus(status),
 *   });
 * }
 *
 * @example
 * // Without total count (pages will be undefined):
 * async findRecent(page?: number, size?: number): Promise<PaginationResponse<Post>> {
 *   return this.paginationService.paginate({
 *     page,
 *     size,
 *     dataFetcher: (skip, take) => this.repository.findRecent(skip, take),
 *   });
 * }
 */
@Injectable()
export class PaginationService {
  /**
   * Default page size if not specified.
   */
  private readonly DEFAULT_SIZE = 20;

  /**
   * Maximum page size allowed.
   */
  private readonly MAX_SIZE = 100;

  /**
   * Paginates data using the provided options.
   *
   * @template T - The type of records being paginated
   * @param options - Configuration options for pagination
   * @returns Promise resolving to a paginated response
   *
   * @throws {Error} If dataFetcher throws an error
   *
   * @example
   * const result = await this.paginationService.paginate({
   *   page: 2,
   *   size: 10,
   *   dataFetcher: (skip, take) => this.prisma.user.findMany({ skip, take }),
   *   countFetcher: () => this.prisma.user.count(),
   * });
   * // Returns: { records: [...], page: 2, size: 10, count: 100, pages: 10 }
   */
  async paginate<T>(
    options: PaginationOptions<T>,
  ): Promise<PaginationResponse<T>> {
    const {
      page = 1,
      size = options.defaultSize || this.DEFAULT_SIZE,
      dataFetcher,
      countFetcher,
      maxSize = this.MAX_SIZE,
    } = options;

    // Validate and normalize page number
    const normalizedPage = Math.max(1, Math.floor(page));

    // Validate and normalize page size
    const normalizedSize = Math.min(Math.max(1, Math.floor(size)), maxSize);

    // Calculate skip (offset) and take (limit)
    const skip = (normalizedPage - 1) * normalizedSize;
    const take = normalizedSize;

    // Fetch data
    const records = await dataFetcher(skip, take);

    // Build base response
    const response: PaginationResponse<T> = {
      records,
      page: normalizedPage,
      size: normalizedSize,
      count: records.length,
    };

    // Fetch total count if countFetcher is provided
    if (countFetcher) {
      const totalCount = await countFetcher();
      response.count = totalCount;
      response.pages = Math.ceil(totalCount / normalizedSize);
    }

    return response;
  }

  /**
   * Calculates pagination metadata without fetching data.
   * Useful for generating pagination info for custom queries.
   *
   * @param page - The current page number (1-indexed)
   * @param size - The number of records per page
   * @param totalCount - The total number of records
   * @returns Object containing skip, take, and pagination metadata
   *
   * @example
   * const metadata = this.paginationService.calculatePaginationMetadata(2, 10, 100);
   * // Returns: { skip: 10, take: 10, page: 2, size: 10, pages: 10, totalCount: 100 }
   */
  calculatePaginationMetadata(
    page: number = 1,
    size: number = this.DEFAULT_SIZE,
    totalCount: number,
  ): {
    skip: number;
    take: number;
    page: number;
    size: number;
    pages: number;
    totalCount: number;
  } {
    const normalizedPage = Math.max(1, Math.floor(page));
    const normalizedSize = Math.min(
      Math.max(1, Math.floor(size)),
      this.MAX_SIZE,
    );

    const skip = (normalizedPage - 1) * normalizedSize;
    const take = normalizedSize;
    const pages = Math.ceil(totalCount / normalizedSize);

    return {
      skip,
      take,
      page: normalizedPage,
      size: normalizedSize,
      pages,
      totalCount,
    };
  }

  /**
   * Converts page-based pagination parameters to skip/take format.
   * Useful when working with repositories that use skip/take directly.
   *
   * @param page - The current page number (1-indexed)
   * @param size - The number of records per page
   * @returns Object containing skip and take values
   *
   * @example
   * const { skip, take } = this.paginationService.pageToSkipTake(2, 10);
   * // Returns: { skip: 10, take: 10 }
   * const users = await this.repository.findAll(skip, take);
   */
  pageToSkipTake(
    page: number = 1,
    size: number = this.DEFAULT_SIZE,
  ): { skip: number; take: number } {
    const normalizedPage = Math.max(1, Math.floor(page));
    const normalizedSize = Math.min(
      Math.max(1, Math.floor(size)),
      this.MAX_SIZE,
    );

    return {
      skip: (normalizedPage - 1) * normalizedSize,
      take: normalizedSize,
    };
  }

  /**
   * Gets the default page size.
   * @returns The default page size
   */
  getDefaultSize(): number {
    return this.DEFAULT_SIZE;
  }

  /**
   * Gets the maximum page size allowed.
   * @returns The maximum page size
   */
  getMaxSize(): number {
    return this.MAX_SIZE;
  }
}
