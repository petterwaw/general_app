# Etap 10 — Utwardzanie i produkcja

Od 2026-09-28 to etap wdrożenia na produkcję. Hosting, nazwa i domena: `DECYZJE.md` §11 i §12.

Środowiska: na razie tylko produkcja, bez środowiska dev (ustalone 2026-10-05).

Rate limity, Sentry, kasowanie porzuconych gier.

## Backup bazy

Codzienny snapshot dysku serwera (EBS, Data Lifecycle Manager) o 03:00 UTC, trzymane 7 ostatnich
(ustawione 2026-10-05). Zrzut samej bazy do S3 (`pg_dump`) — później, gdy dane zaczną mieć
wartość (konta, statystyki). Próbne odtworzenie ze snapshotu jeszcze niezrobione.

## Do sprawdzenia przed wdrożeniem na produkcję

- **`FRONTEND_URL` na produkcji** — lista originów CORS (po przecinku). Na produkcji ma w niej
  być wyłącznie prawdziwy adres frontu: bez `localhost` i bez IP z sieci domowej, które
  dopisuje się lokalnie do testów z telefonu.
- **`NEXT_PUBLIC_API_URL` na produkcji** — prawdziwy adres API. Podmiana hosta na host strony
  w `apps/web/src/app/api/client.ts` (`resolveApiUrl`) działa tylko, gdy w env jest
  `localhost` — sprawdzić, że produkcyjna wartość jej nie uruchamia.
- **`allowedDevOrigins` w `apps/web/next.config.ts`** — dotyczy tylko `next dev`, na produkcji
  nie działa; do usunięcia, jeśli testy po IP nie będą już potrzebne.

## Rate limity — 2026-10-07

- **Limity wg `DECYZJE.md` §11** — `@nestjs/throttler`, licznik na trasę i IP, okno kroczące
  bez dodatkowej blokady. Subskrypcja przez socket nie przechodzi przez guard HTTP, więc jest
  liczona osobno, przez ten sam magazyn liczników.
- **IP zza Caddy** — `trust proxy` = 1 pośrednik; dla socketów ta sama reguła ręcznie
  (`socketClientIp`). Podrobione wpisy `X-Forwarded-For` z przodu nie zmieniają liczonego IP.
- **`GET /games` usunięty**, front pokazuje komunikat 429 z serwera. Testy e2e domyślnie
  z wyłączonym liczeniem, limity mają własne testy (PR #26).

Sprawdzone na produkcji: telefon na danych komórkowych i komputer na wifi mają osobne liczniki
— API widzi prawdziwe IP klientów zza Caddy.

## Sentry — 2026-10-07

- **Same błędy, bez tracingu, profilowania i logów.** Do Sentry idą tylko wyjątki inne niż
  `HttpException` — 4xx i 429 to nie błędy aplikacji. Gatewaye nie dostają globalnych filtrów
  Nest, więc filtr Sentry jest dopięty w gatewayu gry osobno.
- **Prywatność** — Sentry 11 domyślnie wysyła ciasteczka, nagłówki, treść żądań, parametry
  zapytań SQL i zmienne lokalne; wszystko to jest wyłączone, zostaje stack trace.
- **Błędy z przeglądarki przez `/monitoring`** na serwerze Next — adblocki blokują `sentry.io`.
  Ekrany błędów (`error.tsx`, `global-error.tsx`) zgłaszają błąd same, bo granica błędu
  ukrywa go przed SDK.
- **Bez DSN SDK jest wyłączone** — lokalnie, w testach i w CI nic nie wychodzi. DSN API jest
  w `.env` na serwerze, DSN weba to zmienna w GitHub environment `production` (trafia do obrazu
  przy buildzie), token do source map — sekret, przekazany do buildu jako BuildKit secret.
- Sprawdzone lokalnie: błąd 500 z API trafia do Sentry ze stack trace'em, bez nagłówków; 404
  nie trafia; odpowiedzi API dla klienta bez zmian.

Sprawdzone na produkcji: błąd z przeglądarki (rzucony z konsoli) dochodzi do Sentry przez
`/monitoring`, a błąd wysłany z kontenera API na serwerze — z DSN z `.env`.

**Do sprawdzenia przy pierwszym prawdziwym błędzie weba:** stack trace pokazuje kod źródłowy
(source mapy z CI) — błąd z konsoli nie ma pliku źródłowego, więc tego nie sprawdza.

**Dług, który zostaje:**

- Błąd w gatewayu Socket.IO nie był wywołany na żywo — kod podpięty, nie sprawdzony.
- Sentry wylicza lokalizację z IP nadawcy, przy błędach z przeglądarki to IP gracza. Wyłącza
  się w ustawieniach projektu (Security & Privacy), bez zmian w kodzie — niezdecydowane.
- `pnpm lint` w `apps/api` ma `--fix` i przeformatowuje prettierem pliki, które nie trzymają
  się jego stylu — czyli prawie wszystkie. Lint nie jest w CI.
