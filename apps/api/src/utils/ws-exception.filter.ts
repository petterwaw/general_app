import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { ApiErrorResponse } from '@dice-app/contracts';
import { Socket } from 'socket.io'

@Catch(HttpException)
export class WsExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>()
    const statusCode = exception.getStatus()
    const message = exception.getResponse();
    const returnMessage =
      typeof message === 'string' ? message : (message as { message: string }).message;

    const body: ApiErrorResponse = {
      statusCode,
      message: returnMessage,
      data: null,
    };

    client.emit('exception', body)
  }
}