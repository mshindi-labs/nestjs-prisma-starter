/**
 * src/common/utils/raise-http-error.ts
 * Error Handling - Robust error handling utility that catches errors and formats them
 * into user-friendly HTTP exceptions with proper status codes.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotAcceptableException,
  NotFoundException,
  NotImplementedException,
  PayloadTooLargeException,
  PreconditionFailedException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { inspectData } from './functions';

/**
 * Represents an error object with a message property and optional response data.
 */
export interface ErrorWithMessage {
  message: string;
  response?: {
    status?: number;
    statusCode?: number;
    data?: {
      message: string;
    };
  };
}

/**
 * Represents a serialized error with consistent structure.
 */
export interface SerializedError {
  success: false;
  message: string;
  statusCode: number;
  details?: string;
}

/**
 * Type guard to check if the provided value is an error object with a message property.
 * @param error - The value to check.
 * @returns A boolean indicating whether the value is an error object with a message property.
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Type guard to check if the error is a Prisma known request error.
 * @param error - The error to check.
 * @returns A boolean indicating whether the error is a Prisma known request error.
 */
export function isPrismaError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'meta' in error &&
    error.constructor.name === 'PrismaClientKnownRequestError'
  );
}

/**
 * Type guard to check if the error is a NestJS HTTP exception.
 * @param error - The error to check.
 * @returns A boolean indicating whether the error is a NestJS HTTP exception.
 */
export function isHttpException(error: unknown): error is HttpException {
  return error instanceof HttpException;
}

/**
 * Converts any value to an ErrorWithMessage object.
 * Handles circular references and non-serializable objects gracefully.
 * @param maybeError - The value to convert to an ErrorWithMessage object.
 * @returns An ErrorWithMessage object representing the given value.
 */
export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) {
    return maybeError;
  }

  // Handle null or undefined
  if (maybeError === null || maybeError === undefined) {
    return new Error('An unknown error occurred');
  }

  try {
    // Convert to string representation
    let errorMessage = 'An error occurred';

    if (typeof maybeError === 'string') {
      errorMessage = maybeError;
    } else if (
      typeof maybeError === 'number' ||
      typeof maybeError === 'boolean'
    ) {
      errorMessage = maybeError.toString();
    } else if (typeof maybeError === 'object') {
      errorMessage = JSON.stringify(maybeError);
    }

    return new Error(errorMessage);
  } catch {
    // Fallback for circular references or non-serializable objects
    return new Error('An error occurred but could not be serialized');
  }
}

/**
 * Extracts a user-friendly error message from various error formats.
 * Prioritizes nested response messages, then falls back to the main message.
 * @param error - The error object from which to retrieve the error message.
 * @returns A user-friendly error message string.
 */
export function getErrorMessage(error: unknown): string {
  const errorObj = toErrorWithMessage(error);

  // Try to get the most specific error message available
  const message =
    errorObj?.response?.data?.message ||
    errorObj.message ||
    'An error occurred';

  return message;
}

/**
 * Extracts the HTTP status code from various error formats.
 * @param error - The error object.
 * @returns The HTTP status code (defaults to 500 if not found).
 */
export function extractStatusCode(error: unknown): number {
  if (isHttpException(error)) {
    return error.getStatus();
  }

  const errorObj = error as Record<string, unknown>;

  // Try multiple common status code locations
  const statusCode =
    (errorObj?.response as Record<string, unknown>)?.status ||
    (errorObj?.response as Record<string, unknown>)?.statusCode ||
    errorObj?.statusCode ||
    errorObj?.status ||
    errorObj?.httpCode ||
    errorObj?.code;

  // Ensure it's a valid HTTP status code
  if (typeof statusCode === 'number' && statusCode >= 100 && statusCode < 600) {
    return statusCode;
  }

  return 500; // Default to Internal Server Error
}

/**
 * Serializes an error into a consistent format with user-friendly messages.
 * @param error - The error to serialize.
 * @returns A serialized error object with consistent structure.
 */
export function serializeError(error: unknown): SerializedError {
  const message = getErrorMessage(error);
  const statusCode = extractStatusCode(error);

  let details: string | undefined;
  if (isPrismaError(error)) {
    const prismaError = error as unknown as { code: string };
    details = `Prisma Error Code: ${prismaError.code}`;
  }

  return {
    success: false,
    message,
    statusCode,
    details,
  };
}

/**
 * Formats field names from Prisma meta target into a user-friendly string.
 * @param target - The target field(s) from Prisma error meta.
 * @returns A formatted string of field names.
 */
function formatFieldNames(target: unknown): string {
  if (Array.isArray(target)) {
    return target.join(', ');
  }
  if (typeof target === 'string') {
    return target;
  }
  return 'unknown fields';
}

/**
 * Handles Prisma-specific errors and converts them to user-friendly HTTP exceptions.
 * @param error - The Prisma error to handle.
 * @throws {HttpException} - An appropriate NestJS HTTP exception.
 */
function handlePrismaError(error: unknown): never {
  const prismaError = error as {
    code: string;
    meta?: Record<string, unknown>;
  };
  const meta = prismaError.meta || {};

  switch (prismaError.code) {
    case 'P2002': {
      // Unique constraint violation
      const fields = formatFieldNames(meta.target);
      throw new ConflictException(
        `A record with the provided ${fields} already exists. Please use different values.`,
      );
    }

    case 'P2003': {
      // Foreign key constraint violation
      const field = (meta.field_name as string) || 'unknown field';
      throw new BadRequestException(
        `Invalid reference: The ${field} you provided does not exist. Please provide a valid reference.`,
      );
    }

    case 'P2025': {
      // Record not found
      const cause =
        (meta.cause as string) || 'The requested record does not exist';
      throw new NotFoundException(
        `Record not found: ${cause}. Please verify the ID and try again.`,
      );
    }

    case 'P2014': {
      // Required relation violation
      throw new BadRequestException(
        'The change you are trying to make would violate a required relation. Please ensure all required relationships are maintained.',
      );
    }

    case 'P2015': {
      // Related record not found
      throw new NotFoundException(
        'A related record could not be found. Please verify that all referenced records exist.',
      );
    }

    case 'P2016': {
      // Query interpretation error
      throw new BadRequestException(
        'The query could not be interpreted. Please check your request parameters.',
      );
    }

    case 'P2021': {
      // Table does not exist
      throw new InternalServerErrorException(
        'A database table is missing. Please contact support.',
      );
    }

    case 'P2022': {
      // Column does not exist
      throw new InternalServerErrorException(
        'A database column is missing. Please contact support.',
      );
    }

    case 'P2023': {
      // Inconsistent column data
      throw new BadRequestException(
        'The provided data is inconsistent. Please check your input and try again.',
      );
    }

    case 'P2024': {
      // Connection timeout
      throw new InternalServerErrorException(
        'The database connection timed out. Please try again later.',
      );
    }

    default: {
      // Unknown Prisma error
      throw new InternalServerErrorException(
        `A database error occurred. Please try again or contact support if the problem persists.`,
      );
    }
  }
}

/**
 * Maps HTTP status codes to appropriate NestJS exception classes.
 * @param statusCode - The HTTP status code.
 * @param message - The error message.
 * @throws {HttpException} - An appropriate NestJS HTTP exception.
 */
function throwHttpExceptionByStatusCode(
  statusCode: number,
  message: string,
): never {
  switch (statusCode) {
    case 400:
      throw new BadRequestException(message);
    case 401:
      throw new UnauthorizedException(message);
    case 403:
      throw new ForbiddenException(message);
    case 404:
      throw new NotFoundException(message);
    case 405:
      throw new NotImplementedException(message);
    case 406:
      throw new NotAcceptableException(message);
    case 409:
      throw new ConflictException(message);
    case 412:
      throw new PreconditionFailedException(message);
    case 413:
      throw new PayloadTooLargeException(message);
    case 422:
      throw new UnprocessableEntityException(message);
    case 500:
    default:
      throw new InternalServerErrorException(message);
  }
}

/**
 * Main error handler that converts any error into an appropriate NestJS HTTP exception
 * with user-friendly messages. This function should be used in catch blocks throughout
 * the application to ensure consistent error handling.
 *
 * @param error - The error to handle (can be any type).
 * @throws {HttpException} - An appropriate NestJS HTTP exception with a user-friendly message.
 *
 * @example
 * ```typescript
 * try {
 *   await this.prisma.user.create({ data: createUserDto });
 * } catch (error) {
 *   raiseHttpError(error);
 * }
 * ```
 */
export function raiseHttpError(error: unknown): never {
  inspectData({ error });
  // If it's already a NestJS HTTP exception, re-throw it
  if (isHttpException(error)) {
    throw error;
  }

  // Handle Prisma-specific errors with detailed, user-friendly messages
  if (isPrismaError(error)) {
    handlePrismaError(error);
  }

  // Serialize the error to extract message and status code
  const { message, statusCode } = serializeError(error);

  // Check for common error patterns in the message and provide better context
  const uniqueConstraintPattern =
    /Unique constraint failed on the fields?: \(?`?([^`)+]+)`?\)?/i;
  const duplicateKeyPattern =
    /duplicate key value violates unique constraint "?([^"]+)"?/i;

  const uniqueMatch = message.match(uniqueConstraintPattern);
  if (uniqueMatch) {
    const fields = uniqueMatch[1].replace(/[`_]/g, ' ').trim();
    throw new ConflictException(
      `A record with the provided ${fields} already exists. Please use different values.`,
    );
  }

  const duplicateMatch = message.match(duplicateKeyPattern);
  if (duplicateMatch) {
    const constraint = duplicateMatch[1].replace(/_/g, ' ');
    throw new ConflictException(
      `This operation violates a uniqueness constraint (${constraint}). Please use different values.`,
    );
  }

  // Throw the appropriate HTTP exception based on status code
  throwHttpExceptionByStatusCode(statusCode, message);
}
