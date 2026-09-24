import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { Response } from 'express'
import type { ApiResponse } from '@dice-app/contracts';

@Injectable()
export class TransfromInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
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
