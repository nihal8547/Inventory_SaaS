import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: Record<string, any> = { message: 'Internal server error' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      errorResponse = typeof res === 'string' ? { message: res } : (res as object);
    } else if (exception instanceof Error) {
      this.logger.error(
        `[Unhandled Error] ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
      if (process.env.NODE_ENV !== 'production') {
        errorResponse = { message: exception.message, error: 'Internal Server Error' };
      }
    } else {
      this.logger.error(`[Unknown Exception] ${request.method} ${request.url}`, exception);
    }

    if (status >= 500) {
      this.logger.error(
        `[${status}] ${request.method} ${request.url} - ${JSON.stringify(errorResponse)}`,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...errorResponse,
    });
  }
}
