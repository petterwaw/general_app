import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';
import type { ApiErrorResponse } from '@dice-app/contracts';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = exception.getStatus()
    const message = exception.getResponse();
    const returnMessage =
      typeof message === 'string' ? message : (message as { message: string }).message;

    const body: ApiErrorResponse = {
      statusCode,
      message: returnMessage,
      data: null,
    };

    response.status(statusCode).json(body);
  }
}
