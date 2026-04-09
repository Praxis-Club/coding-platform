import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: process.env.NODE_ENV === 'development' 
          ? `Database operation failed: ${err.message}`
          : 'Database operation failed',
      },
    });
  }

  // Handle validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err,
      },
    });
  }

  // Default error
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
};
