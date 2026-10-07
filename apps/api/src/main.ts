import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  // Comma-separated list, e.g. "http://localhost:8080,http://192.168.1.14:8080" for LAN testing.
  const frontendUrls = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  if (frontendUrls.length === 0) {
    throw new Error('FRONTEND_URL environment variable is required');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app, frontendUrls);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
