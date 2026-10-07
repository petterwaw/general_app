import cookieParser from 'cookie-parser';
import { TransfromInterceptor } from './utils/transfrom.interceptor';
import { HttpExceptionFilter } from './utils/http-exception.filter';
import { refreshHostCookie } from './utils/host-cookie';
import { CorsIoAdapter } from './utils/cors-io.adapter';
import type { NestExpressApplication } from '@nestjs/platform-express';

// Shared by main.ts and the e2e test app, so tests run the same HTTP pipeline as production.
// frontendUrls is an explicit allowlist — never reflect arbitrary origins while credentials are on.
export function configureApp(app: NestExpressApplication , frontendUrls: string[]) {
  app.use(cookieParser());
  app.use(refreshHostCookie);
  app.useGlobalInterceptors(new TransfromInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: frontendUrls,
    credentials: true,
  });
  app.useWebSocketAdapter(new CorsIoAdapter(app, frontendUrls));
  app.set('trust proxy', 1);
}
