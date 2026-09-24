import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new Error('FRONTEND_URL environment variable is required');
  }

  const app = await NestFactory.create(AppModule);
  configureApp(app, frontendUrl);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
