# Etap 3 — API i baza

Schemat, migracje, endpointy: utwórz grę, dodaj uczestnika, wykonaj akcję, pobierz stan.
Obowiązkowo: `revision`, log zdarzeń, klucz idempotencji, `status` gry, `ostatniaAktywnosc`.

**Gotowe gdy:** partię da się rozegrać z Postmana, a restart serwera w połowie niczego nie psuje.

**Postęp: W TRAKCIE (stan na 2026-09-24).** Wszystkie endpointy z opisu etapu istnieją
i działają: `POST /games` (tworzy grę z listą graczy, zakłada `Identity` hosta i odsyła
sekret w cookie), `POST /games/:id/join`, `POST /games/:id/start`, `POST /games/:id/roll`
(wpisanie kości fizycznych), `POST /games/:id/score`, `GET /games/:id`, `GET /games`.
Każda akcja wymaga nagłówka `Idempotency-Key`, dopisuje wiersz do `EventLog`, podbija
`revision` i `lastActivity` pod optymistyczną blokadą (`updateMany` z warunkiem na starej
`revision`, sprawdzenie `count === 1`). Punkty liczy wyłącznie `game-core` — serwis podaje
reducerowi surowe kości i kategorię.

Testy e2e (`apps/api/test/`, osobna baza z `DATABASE_URL_TEST`): pełna partia przez HTTP,
walidacje (brak rzutu, podwójny rzut, obcy sekret hosta, powtórzony klucz idempotencji).

**Kryterium "gotowe gdy" nadal niespełnione w drugiej części:** "restart serwera w połowie
niczego nie psuje" nie zostało przećwiczone jako scenariusz. Cały stan siedzi w bazie,
więc powinno działać, ale to hipoteza, nie sprawdzony fakt.

Do przeglądu z 2026-09-24 — lista uwag jest na końcu tego pliku.

Środowisko lokalne (do odtworzenia w nowej sesji terminala/maszyny):

- Node 24 LTS przez `nvm`, `pnpm@11.21.0` przypięty przez `corepack`.
- Docker Desktop + `docker compose up -d` (Postgres 16, dane w `.docker/`, port 5432,
  user/hasło/baza: `dice_app`/`dice_app`/`dice_app`).

`packages/game-core` — dług ze stanu na koniec etapu 2 częściowo spłacony:

- Dodano `src/index.ts` — publiczne API paczki to tylko typy z `types.ts` oraz
  `Player`/`GameState`/`Action`/`createInitialState`/`isPlayerTurn`/`nextPlayerId`/
  `isGameOver`/`reducer` z `reducer.ts`. Świadomie **nie** eksportuje niczego z `scoring.ts`
  ani `validation.ts` — to są szczegóły implementacyjne, których reducer używa wewnętrznie.
- Dodano `tsconfig.json` (rozszerza `tsconfig.base.json`, `noEmit: true`) i `typescript`
  jako devDependency — `pnpm --filter @dice-app/game-core typecheck` teraz działa i jest
  zielone (jedyny błąd typu, znany z etapu 2, naprawiony przez `@ts-expect-error` w teście
  bezpiecznika `default` w `reducer.test.ts`).
- Pola `main`/`types`/`exports` w `package.json` **celowo nadal nie istnieją** — nic jeszcze
  nie importuje `game-core` z zewnątrz, więc to nie blokuje niczego. Decyzja dist vs. źródło
  odłożona do momentu, aż `apps/api` faktycznie napisze pierwszy `import` z tej paczki.

`apps/api/prisma/schema.prisma` — cztery modele, zwalidowane i zmigrowane (nazwy modeli
i pól zostały przetłumaczone na angielski migracją `20260917170000_english_database_and_host`):

- `Game` — `status` (enum `GameStatus`: LOBBY/IN_PROGRESS/COMPLETED/ABANDONED/EXPIRED),
  `revision`, `lastActivity`, `createdAt`, `creationKey` (unikalny klucz idempotencji samego
  tworzenia gry), `currentDice` (JSON — szkic tury, kasowany przy zapisie kategorii), relacja
  do listy `participants` oraz osobna, nazwana relacja `currentPlayer` (z `@unique` na FK,
  żeby to była prawdziwa relacja 1-do-1).
- `Participant` — `name`, `scoreCard` jako **JSON** (mapuje się 1:1 na `ScoreCard` z
  game-core; wybrane zamiast osobnej tabeli per-kategoria, bo agregaty globalne i tak liczą
  się w tle, do osobnych tabel — patrz `DECYZJE.md` §9 — więc relacyjne query po kategoriach
  nigdy nie będzie potrzebne), `turnOrder`, `role` (enum `ParticipantRole`:
  HOST/PLAYER/OBSERVER — zgodnie z `DECYZJE.md` §2 rola jest polem, nie pozycją na liście),
  `userId` (na razie zawsze puste, pod etap 5) i `identityId`.
- `Identity` — `secretHash`, czyli SHA-256 z 32-bajtowego losowego sekretu hosta. Sekret
  wędruje do przeglądarki w ciasteczku `host_secret`, w bazie leży wyłącznie skrót.
- `EventLog` — `actionType` (String, nie enum), `payload` (JSON), `revisionAfter`,
  `idempotencyKey` z unikalnością **złożoną** `@@unique([gameId, idempotencyKey])`
  (unikalność w obrębie gry, nie globalnie).
- Świadomie brak pola źródła kości (fizyczne/wirtualne) na `Game` — na razie wyłącznie kości
  fizyczne, zgodnie z decyzją właściciela; dopisanie tego pola to etap 7.
- Migracje: `20260908181305_init`, `20260916173008_add_aktualne_kosci`,
  `20260917170000_english_database_and_host`, `20260917174750_add_identity`.
- Prisma **przypięta na stabilną wersję 7.10.0** — tag `latest` na npm w dniu instalacji
  wskazywał na `8.0.0-rc.13`, która dodatkowo ciągnęła zbędne zależności (`alchemy`,
  `workerd`/Cloudflare Workers runtime) przez eksperymentalny `@prisma/composer`. Unikać
  instalowania `prisma`/`@prisma/client` bez podanej wersji, dopóki 8.x nie wyjdzie stabilnie.
- Prisma 7 nie ma już silnika binarnego — wymaga **driver adaptera** (`@prisma/adapter-pg` +
  `pg`) i osobnego `prisma7.config.ts` zamiast URL-a wprost w `schema.prisma`.
- `prisma init` w wersji 7 dodatkowo instaluje pakiet dokumentacji Prismy jako "skills dla
  agentów AI" (`.claude/skills/`, `.windsurf/skills/`, `.agents/skills/`, `skills-lock.json`)
  — zostawione lokalnie (przydatne jako aktualna dokumentacja tej wersji), ale dodane do
  `apps/api/.gitignore`, żeby nie wchodziło do repo.

`apps/api/src/prisma/` — warstwa łącząca Prisma z NestJS:

- `PrismaService` — `@Injectable()`, `extends` wygenerowanego `PrismaClient`
  (`../../generated/prisma/client` — niestandardowa ścieżka z `output` w `schema.prisma`,
  nie `@prisma/client`), konstruktor buduje `PrismaPg` z `DATABASE_URL`, hooki
  `OnModuleInit`/`OnModuleDestroy` wołają `$connect()`/`$disconnect()`.
- `PrismaModule` — eksportuje `PrismaService`, zaimportowany w `AppModule`.
- Sprawa `DATABASE_URL` z poprzedniej notatki jest **rozwiązana**: `AppModule` importuje
  `ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' })`, a `forRoot` wczytuje
  plik synchronicznie, zanim Nest utworzy jakikolwiek provider — `PrismaService`
  w konstruktorze widzi już `process.env.DATABASE_URL`. Ścieżka `'../../.env'`
  jest jednak liczona względem **katalogu roboczego procesu**, nie pliku — działa,
  dopóki API startuje z `apps/api`. Testy e2e obchodzą to własnym
  `test/setup-env.ts` (wczytuje `.env` i podstawia `DATABASE_URL_TEST` pod `DATABASE_URL`).

`apps/api/src/utils/` — spójny kształt odpowiedzi API:

- `TransfromInterceptor` (nazwa ma literówkę — powinno być "Transform", jeszcze niepoprawione)
  — globalny interceptor, owija udane odpowiedzi w `{ statusCode, message, data }`.
- `HttpExceptionFilter` — globalny filtr wyjątków, łapie tylko `HttpException` (świadomie, nie
  `@Catch()` bez argumentu — nieoczekiwane błędy wewnętrzne nadal lecą do domyślnego handlera
  Nesta, nieopakowane; uznane za bezpieczniejsze niż ryzyko wycieku szczegółów błędu). Zwraca
  ten sam kształt co interceptor: `{ statusCode, message, data: null }`.
- Oba zarejestrowane globalnie w `main.ts` (`useGlobalInterceptors`/`useGlobalFilters`,
  wołane ręcznie przez `new`, nie przez DI — OK, dopóki żaden z nich nie potrzebuje
  wstrzykiwanych zależności).

Znany, niespłacony dług (nie blokuje dalszej pracy):

- Literówka `Transfrom` → `Transform` w nazwie klasy/pliku interceptora.
- `app.controller.spec.ts` — poprawione (woła `getHealth()`).
- `apps/api/src/game/game.controller.spec.ts` i `game.service.spec.ts` to nadal puste
  scaffoldy z Nest CLI.
- `update()` / `remove()` w `GameService` (zwracają stringi ze scaffoldu), `UpdateGameDto`
  i zakomentowane trasy `@Patch`/`@Delete` w kontrolerze — martwy kod.
- `.env.example` nie wymienia `FRONTEND_URL` (używane przez CORS w `main.ts`) ani
  `NEXT_PUBLIC_API_URL` (używane przez cały `apps/web`).

---

## Przegląd etapu 3 — 2026-09-24

Lista uwag z przeglądu pod kątem poprawności, bezpieczeństwa i rozbudowy poza MVP.
**Nic z tego nie zostało poprawione** — to lista do przepracowania przez właściciela.

### Rozjazdy z ustaleniami w `docs/`

1. **`POST /games/:id/roll` odrzuca poprawkę kości** (`if (game.currentDice) throw`), a
   `DECYZJE.md` §4 mówi, że do momentu zapisania kategorii cała tura jest **szkicem** i host
   może poprawiać wpisane wartości. Test e2e „should not allow rolling dice twice in the same
   turn" utrwala zachowanie sprzeczne z decyzją. Do rozstrzygnięcia: zmieniamy kod czy decyzję.
2. **`POST /games/:id/join` nie sprawdza niczego poza statusem gry** — każdy, kto zna `id`
   gry, dopisuje sobie pełnoprawnego gracza z kartą wyników i miejscem w kolejce. `DECYZJE.md`
   §3 mówi, że dołączeni przez QR są **tylko do podglądu**, a graczy wpisuje host. Dodatkowo
   nie ma żadnego limitu liczby uczestników (pozycja z `DO-USTALENIA.md`), więc to także
   nieograniczone dopisywanie wierszy do bazy przez anonimowego klienta.
3. **`GET /games` zwraca wszystkie gry z bazy, bez uwierzytelnienia i bez stronicowania.**
   Wyciek listy partii i rosnąca w nieskończoność odpowiedź; nic w `apps/web` z tego nie
   korzysta.
4. **Suma punktów, bonus 63/35 i zwycięzca liczą się wyłącznie na froncie**
   (`gameScoreBoard.tsx`: `getUpperTotal` / `getBonus` / `getTotal`). `game-core` nie ma
   funkcji liczącej sumę, serwer nigdzie nie zapisuje wyniku końcowego. To łamie zasadę
   „serwer jest jedynym autorytetem" i blokuje etap 8 — statystyki nie mają z czego powstać.
5. **`packages/contracts` to pusty `package.json`**, a `CLAUDE.md` i `DECYZJE.md` §11 mówią
   o wspólnych typach i schematach **Zod**. Faktycznie: API waliduje `class-validator`-em,
   a lista 15 kategorii jest przepisana ręcznie w trzech miejscach (`game-core/types.ts`,
   `score-game.dto.ts`, `apps/web/src/app/types/gameTypes.ts`). Albo doganiamy decyzję, albo
   ją zmieniamy — dziś dokumentacja opisuje coś, czego nie ma.
6. **`EventLog` nie wystarcza do odtworzenia partii** (`DECYZJE.md` §10 pkt 2): `payload`
   zdarzenia `saveCategory` zawiera tylko `playerId` i `category`, bez kości i bez przyznanych
   punktów. Brakuje też indeksu `@@index([gameId, revisionAfter])`, po którym miało iść
   dosyłanie zmian po ponownym połączeniu (§10 pkt 1).

### Bezpieczeństwo i trwałość sesji hosta

7. **Ciasteczko `host_secret` jest jedno na przeglądarkę i nie ma daty ważności.** Nazwa nie
   zawiera `id` gry, więc utworzenie drugiej gry na tym samym urządzeniu **nadpisuje sekret
   pierwszej** i host traci kontrolę nad tamtą partią. Brak `maxAge` / `expires` robi z niego
   ciasteczko sesyjne — zamknięcie przeglądarki je kasuje, co jest wprost sprzeczne
   z `DECYZJE.md` §5 („host może wrócić do gry po zamknięciu przeglądarki"). Do tego
   `secure: false` na sztywno i brak `path`.
8. **Powtórzony `POST /games` z tym samym `Idempotency-Key` zwraca `hostSecret: null`**,
   więc kontroler nie ustawia ciasteczka. Jeżeli pierwsze żądanie dotarło do serwera, a
   odpowiedź nie wróciła do przeglądarki, host zostaje **na trwałe zamknięty poza własną grą**
   — sekretu nie da się odzyskać, bo w bazie jest wyłącznie jego skrót.
9. **`verifyHost(gameId, hostSecret: string)` dostaje w praktyce `undefined`**, kiedy
   ciasteczka nie ma — `createHash().update(undefined)` rzuca `TypeError`, czyli zamiast
   czystego `403` klient dostaje `500`. Typ w sygnaturze kłamie na temat tego, co przychodzi
   z `request.cookies`.
10. **`app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true })`** — przy
    braku zmiennej `origin` jest `undefined`, co w Nest/Express oznacza odbicie dowolnego
    źródła. W połączeniu z `credentials: true` i ciasteczkiem hosta to realna dziura.
    Konfiguracja powinna raczej wysypać start procesu, niż po cichu przejść w tryb „wszyscy".
11. **Brak jakiejkolwiek ochrony przed CSRF** — wszystkie akcje to `POST`-y autoryzowane
    samym ciasteczkiem, a `SameSite: 'lax'` nie jest pełną ochroną. Do przemyślenia `strict`
    albo wymaganie własnego nagłówka.

### Poprawność

12. **Błędy z reducera (`game-core`) lecą jako `500`.** „Kategoria jest już zajęta" czy „to
    nie jest tura tego gracza" to zwykłe `Error`, których `HttpExceptionFilter` nie łapie —
    klient dostaje `Internal server error` zamiast `400` / `409`. Brakuje jednego miejsca,
    które tłumaczy wyjątki domenowe na odpowiedzi HTTP.
13. **`game.currentDice as DiceRoll` i `player.scoreCard as ScoreCard`** to rzutowania bez
    walidacji — kolumna `Json` może zawierać cokolwiek (stare wiersze, ręczna zmiana w bazie),
    a reducer policzy z tego punkty bez mrugnięcia. To jedyne miejsce, w którym dane wchodzą
    do silnika z pominięciem walidacji.
14. **Testy e2e uruchamiają aplikację inaczej niż produkcja.** `test/test-app.ts` rejestruje
    tylko `cookieParser` — bez `ValidationPipe`, bez `TransfromInterceptor` i bez
    `HttpExceptionFilter`. Skutek: żadna reguła z DTO nie jest przetestowana, a testy
    sprawdzają `response.body.id`, podczas gdy prawdziwe API zwraca
    `{ statusCode, message, data }` i to `data` konsumuje front. Dwa różne kontrakty, zero
    testów na ten prawdziwy.
15. **`TransfromInterceptor` bierze `message` z `response.statusMessage`**, które przy
    odpowiedzi jeszcze nieodesłanej zwykle jest `undefined` — więc operator `??` prawie
    zawsze schodzi na `'Success'`. Działa przypadkiem, nie z projektu.
16. **`turnOrder` w `join` jest liczony jako `count + 1`** — dwa równoczesne dołączenia mogą
    dostać ten sam numer (`turnOrder` nie ma unikalności w obrębie gry, a `count()` i
    `create()` nie są odizolowane od równoległej transakcji na domyślnym poziomie izolacji).
17. **`start()` ustawia pierwszego uczestnika z listy**, nie sprawdzając jego `role` — dziś
    obserwatorów nie ma, więc to dług pod etap 6, nie błąd.

### Co jest zrobione dobrze

- **Sekret hosta trzymany wyłącznie jako skrót SHA-256 z 32 losowych bajtów**, w ciasteczku
  `httpOnly` — dokładnie tak, jak mówi `DECYZJE.md` §2, i bez pokusy trzymania go
  w `localStorage`.
- **Optymistyczna blokada przez `updateMany` z warunkiem na starej `revision` i sprawdzeniem
  `count === 1`** — to poprawny wzorzec, odporny na równoległe żądania, a nie „przeczytaj,
  sprawdź, zapisz".
- **Idempotencja zrobiona dwutorowo**: sprawdzenie `EventLog` przy wejściu w transakcję plus
  złapanie `P2002` na wyjściu. To jest dokładnie ten drugi tor, o którym się zapomina.
- **Punktowanie nie wyciekło do serwisu ani na front** — `score()` podaje reducerowi surowe
  kości z bazy i kategorię, wynik liczy `game-core`. Zgodnie z `DECYZJE.md` §4.
- **Zestaw testów e2e obejmuje pełną partię i cztery scenariusze negatywne** — na tym etapie
  projektu to więcej, niż się zwykle spotyka.
