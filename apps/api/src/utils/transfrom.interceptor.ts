import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { Response } from 'express'

@Injectable()
export class TransfromInterceptor<T> implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>()
    const statusCode = response.statusCode ?? 200
    const message = response.statusMessage ?? 'Success'

    return next.handle().pipe(map((data: T) => ({
      statusCode,
      message,
      data
    })))
  }
}
