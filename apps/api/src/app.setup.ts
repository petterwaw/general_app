import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { TransfromInterceptor } from './utils/transfrom.interceptor';
import { HttpExceptionFilter } from './utils/http-exception.filter';

// Shared by main.ts and the e2e test app, so tests run the same HTTP pipeline as production.
export function configureApp(app: INestApplication, frontendUrl: string) {
  app.use(cookieParser());
  app.useGlobalInterceptors(new TransfromInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });
}
