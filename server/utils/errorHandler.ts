/**
 * Error handling utilities for the WordPress to Markdown converter
 */
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Used to distinguish operational errors from programming errors
    this.data = data;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const ErrorTypes = {
  VALIDATION_ERROR: 'ValidationError',
  PARSING_ERROR: 'ParsingError',
  FILE_NOT_FOUND: 'FileNotFoundError',
  CONVERSION_ERROR: 'ConversionError',
  STORAGE_ERROR: 'StorageError',
  SERVER_ERROR: 'ServerError',
  NOT_FOUND: 'NotFoundError',
  BAD_REQUEST: 'BadRequestError',
};

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error for server-side debugging
  logError(err);

  // Defaults
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'Something went wrong';
  let stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;
  let errorData = err.data || undefined;

  // Format for multer file size limit errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    status = 'fail';
    message = 'File too large. Maximum size is 100MB.';
  }

  // Format for invalid JSON errors
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    status = 'fail';
    message = 'Invalid request: Could not parse JSON body.';
  }

  // Handle XML parsing errors
  if (err.message && err.message.includes('XML')) {
    statusCode = 400;
    status = 'fail';
    message = 'Invalid XML file. Please upload a valid WordPress XML export file.';
  }

  // Format response based on API or HTML request
  const isAPIRequest = req.originalUrl.includes('/api/');
  if (isAPIRequest) {
    return res.status(statusCode).json({
      status,
      message,
      timestamp: new Date().toISOString(),
      ...(stack && { stack }),
      ...(errorData && { data: errorData }),
    });
  }

  // For HTML requests (less likely in this app, but just in case)
  res.status(statusCode).send(`
    <html>
      <head><title>Error - ${statusCode}</title></head>
      <body>
        <h1>Error: ${statusCode}</h1>
        <p>${message}</p>
        ${stack ? `<pre>${stack}</pre>` : ''}
      </body>
    </html>
  `);
};

export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

export const logError = (error: Error, source: string = 'server') => {
  console.error(`[${source} error] ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
};