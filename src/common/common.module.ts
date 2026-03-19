import { Module, Global } from '@nestjs/common';
import { PaginationService } from './services/pagination/pagination.service';

/**
 * Global module that provides common services and utilities
 * available throughout the application.
 *
 * This module is marked as @Global, so you don't need to import it
 * in every feature module. The services are automatically available.
 */
@Global()
@Module({
  providers: [PaginationService],
  exports: [PaginationService],
})
export class CommonModule {}
