import { Request, Response, NextFunction } from 'express';

export interface ActionError {
  message: string;
  statusCode?: number;
  code?: string;
}

// Custom error class for Actions API
export class ActionsError extends Error {
  public statusCode: number;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ActionsError';
  }
}

// Error handler middleware
export function errorHandler(
  error: Error | ActionsError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle ActionsError
  if (error instanceof ActionsError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle Solana-specific errors
  if (error.message.includes('Transaction simulation failed')) {
    res.status(400).json({
      error: 'Transaction would fail',
      message: 'The transaction simulation failed. Please check your inputs and try again.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (error.message.includes('Insufficient funds')) {
    res.status(400).json({
      error: 'Insufficient funds',
      message: 'The account does not have enough SOL to complete this transaction.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred. Please try again later.',
    timestamp: new Date().toISOString(),
  });
}

// Async error wrapper
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Validation middleware
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      next(new ActionsError(`Validation failed: ${error.message}`, 400, 'VALIDATION_ERROR'));
    }
  };
}