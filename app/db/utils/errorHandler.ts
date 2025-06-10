import { Prisma } from '@prisma/client';

export class DatabaseError extends Error {
  code: string;
  meta?: Record<string, any>;

  constructor(message: string, code: string, meta?: Record<string, any>) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.meta = meta;
  }
}

export function handleDatabaseError(error: unknown): never {
  console.error('Database error:', error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle known Prisma errors
    switch (error.code) {
      case 'P2002':
        throw new DatabaseError(
          `Unique constraint violation: ${error.meta?.target as string || 'unknown field'}`,
          'UNIQUE_CONSTRAINT_VIOLATION',
          error.meta
        );
      case 'P2003':
        throw new DatabaseError(
          `Foreign key constraint failed: ${error.meta?.field_name as string || 'unknown field'}`,
          'FOREIGN_KEY_CONSTRAINT_FAILED',
          error.meta
        );
      case 'P2025':
        throw new DatabaseError(
          'Record not found',
          'RECORD_NOT_FOUND',
          error.meta
        );
      default:
        throw new DatabaseError(
          `Database error: ${error.message}`,
          `PRISMA_ERROR_${error.code}`,
          error.meta
        );
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    // Handle validation errors
    throw new DatabaseError(
      `Validation error: ${error.message}`,
      'VALIDATION_ERROR'
    );
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    // Handle initialization errors
    throw new DatabaseError(
      `Database initialization error: ${error.message}`,
      'INITIALIZATION_ERROR',
      { errorCode: error.errorCode }
    );
  } else if (error instanceof Error) {
    // Handle generic errors
    throw new DatabaseError(
      `Unexpected database error: ${error.message}`,
      'UNKNOWN_ERROR'
    );
  } else {
    // Handle unknown errors
    throw new DatabaseError(
      'Unknown database error occurred',
      'UNKNOWN_ERROR'
    );
  }
} 