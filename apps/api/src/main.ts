import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransfromInterceptor } from './utils/transfrom.interceptor'
import { HttpExceptionFilter } from './utils/http-exception.filter'


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new TransfromInterceptor())
  // TODO: zarejestruj HttpExceptionFilter analogicznie do linijki wyżej,
  // ale metodą app.useGlobalFilters(...)
  app.useGlobalFilters(new HttpExceptionFilter())
  app.enableCors();
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
