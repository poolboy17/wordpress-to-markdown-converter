/**
 * Error handling utilities for the WordPress to Markdown converter
 */

import { Request, Response, NextFunction } from 'express';

// Custom error class with status code and additional data
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // This means it's a known operational error we can handle
    this.data = data;

    // Capture stack trace, excluding the constructor call from the stack
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types with specific messages and status codes
export const ErrorTypes = {
  FILE_UPLOAD: {
    TOO_LARGE: new AppError('File is too large. Maximum size is 100MB.', 413),
    INVALID_FORMAT: new AppError('Invalid file format. Only WordPress XML export files are supported (.xml or .xml.gz).', 415),
    NOT_FOUND: new AppError('No file was uploaded. Please select a file.', 400),
    PROCESSING_FAILED: new AppError('Failed to process the uploaded file. Please verify it\'s a valid WordPress XML export.', 422)
  },
  CONVERSION: {
    NOT_FOUND: new AppError('Conversion not found. It may have been removed or expired.', 404),
    FAILED: new AppError('Conversion failed. There was an error processing your file.', 500)
  },
  SERVER: {
    INTERNAL: new AppError('Internal server error. Please try again later.', 500),
    DATABASE: new AppError('Database error. Failed to store or retrieve data.', 500)
  }
};

// Global error handler middleware
export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default status code and message
  let statusCode = 500;
  let message = 'Something went wrong';
  let errorData: any = null;

  // Handle known operational errors
  if ('statusCode' in err) {
    statusCode = err.statusCode;
    message = err.message;
    errorData = err.data;
  } else if (err.name === 'MulterError') {
    // Handle multer-specific errors
    statusCode = 400;
    if (err.message.includes('too large')) {
      message = 'File is too large. Maximum size is 100MB.';
      statusCode = 413;
    } else {
      message = `File upload error: ${err.message}`;
    }
  } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    // Handle JSON parsing errors
    statusCode = 400;
    message = 'Invalid JSON format in request';
  } else if (err.name === 'ValidationError') {
    // Handle validation errors (e.g., from Zod)
    statusCode = 400;
    message = 'Validation error: ' + err.message;
  } else {
    // For unexpected errors, log the full error for debugging
    console.error('Unexpected error:', err);
    message = process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'An unexpected error occurred';
  }

  // Respond with error details
  const errorResponse: any = {
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    timestamp: new Date().toISOString()
  };

  // Include error details in development mode or for operational errors
  if (process.env.NODE_ENV === 'development' || ('isOperational' in err && err.isOperational)) {
    if (errorData) {
      errorResponse.data = errorData;
    }
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
    }
  }

  res.status(statusCode).json(errorResponse);
};

// Async handler to avoid try-catch blocks in route handlers
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// Error logger
export const logError = (error: Error, source: string = 'server') => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    source,
    name: error.name,
    message: error.message,
    stack: error.stack
  };
  
  console.error(`[ERROR][${timestamp}][${source}] ${error.name}: ${error.message}`);
  
  // In a real app, you might log to a file or external service
  return errorInfo;
};