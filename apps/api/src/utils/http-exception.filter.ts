import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = exception.getStatus()
    const message = exception.getResponse();
    const returnMessage =
      typeof message === 'string' ? message : (message as { message: string }).message;

    response.status(statusCode).json({
      statusCode,
      message: returnMessage,
      data: null,
    });
  }
}
