import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';

// @Catch(HttpException) łapie tylko "znane" błędy HTTP Nesta (400, 404, itd.).
// @Catch() bez argumentu złapałby WSZYSTKO, łącznie z nieoczekiwanymi błędami
// wewnętrznymi (np. literówka gdzieś w kodzie) — ryzykowne, bo mógłbyś przez
// pomyłkę zwrócić klientowi szczegóły wewnętrznego błędu. Zostawiam węższą,
// bezpieczniejszą wersję — zmień, jeśli masz inny plan.
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    // TODO: HttpException ma metodę zwracającą kod HTTP (np. 404, 400).
    // Jak się nazywa? (podpowiedź: zacznij pisać "exception.get" i zobacz,
    // co podpowiada Ci edytor)
    const statusCode = exception.getStatus()

    // TODO: HttpException ma metodę zwracającą treść odpowiedzi błędu.
    // Zanim wpiszesz cokolwiek na sztywno, zrób console.log(exception.getResponse())
    // i zobacz DOKŁADNIE, co tam siedzi — to nie zawsze jest gotowy string.
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
