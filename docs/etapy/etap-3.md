# Etap 3 — API i baza

Schemat, migracje, endpointy: utwórz grę, dodaj uczestnika, wykonaj akcję, pobierz stan.
Obowiązkowo: `revision`, log zdarzeń, klucz idempotencji, `status` gry, `ostatniaAktywnosc`.

**Gotowe gdy:** partię da się rozegrać z Postmana.

> Sprawdzenie „restart serwera w połowie partii niczego nie psuje” przeniesione do etapu 4
> (decyzja właściciela 2026-09-25) — do przećwiczenia na działającym UI.

**Postęp: W TRAKCIE (stan na 2026-09-25 — wpis na końcu pliku).** Wszystkie endpointy z opisu etapu istnieją
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

Do przeglądu z 2026-09-24 — lista uwag jest na końcu tego pliku, a pod nią sekcja
„Poprawki po przeglądzie" z tego samego dnia (kontrakt API w `packages/contracts`,
`runAction` w serwisie, testy e2e na konfiguracji produkcyjnej).

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
**Stan w chwili przeglądu — nic z tego nie było poprawione.** Co poprawiono później, jest
w sekcji „Poprawki po przeglądzie" na końcu pliku.

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

---

## Poprawki po przeglądzie — 2026-09-24

Zmiany na gałęzi `sendRollFeature`, **jeszcze niezacommitowane** w chwili pisania. Punkt
wyjścia: code review `apps/api` z tego samego dnia plus decyzje właściciela (limit 8 graczy,
Zod w `packages/contracts`, `join` zostaje, `GET /games` zostaje) — wpisane do `DECYZJE.md`.

`packages/contracts` — paczka przestała być pustym `package.json`:

- `src/game.ts` — schematy żądań w Zod: `createGameSchema` (1–`MAX_PLAYERS` = 8 imion,
  każde `trim()` i 1–50 znaków), `joinGameSchema`, `rollSchema` (`diceRollSchema` — krotka
  pięciu wartości 1–6), `scoreSchema` (`categorySchema = z.enum(CATEGORIES)`). Wszystkie
  `z.strictObject` — nieznane pola to `400`. Typy wejścia (`CreateGameInput` itd.) przez
  `z.infer`.
- Typy odpowiedzi `GameView` / `ParticipantView` oraz `GameStatus` / `ParticipantRole` —
  zwykłe typy TS, nie schematy, bo odpowiedź buduje serwer, nie przychodzi z zewnątrz.
- `src/api.ts` — koperta `ApiResponse<T>` i `ApiErrorResponse = ApiResponse<null>`.
- Re-eksportuje typy domenowe z `game-core` (`Category`, `DiceRoll`, `DieFace`, `ScoreCard`),
  więc front importuje wszystko z jednego miejsca.
- Budowana jak `game-core` (`tsc` do `dist`, `"type": "module"`). **Front bierze typy
  z `dist`** — po zmianie w `contracts` albo `game-core` trzeba
  `pnpm --filter "./packages/*" build`.

`packages/game-core` — eksportuje `CATEGORIES` (`as const`), a typ `Category` jest z niej
wyprowadzony (`(typeof CATEGORIES)[number]`). Powód: lista 15 kategorii była przepisana
ręcznie w trzech miejscach (uwaga 5 z przeglądu). `CATEGORY_SECTION` w `validation.ts`
i `createEmptyScoreCard` w `reducer.ts` nadal wypisują klucze same — nie ruszane.

`apps/api` — walidacja i kształt odpowiedzi:

- `utils/zod-validation.pipe.ts` — `ZodValidationPipe` (~15 linii, bez `nestjs-zod`),
  podpinany per parametr: `@Body(new ZodValidationPipe(createGameSchema))`. Błąd walidacji
  to `400` z komunikatem `ścieżka: opis; ...`. Usunięte: `dto/`, `entities/`, globalny
  `ValidationPipe`, zależności `class-validator`, `class-transformer`,
  `@nestjs/mapped-types`, `ts-jest`.
- `game/game.view.ts` — `gameInclude` (uczestnicy po `turnOrder`), typ
  `GameWithParticipants` i `toGameView()` — **jedyne miejsce, które decyduje, co wychodzi
  z serwera**. Nie wychodzą `creationKey`, `identityId`, `userId`, `gameId`,
  `lastActivity`, `createdAt`. Każdy endpoint gry (łącznie z `join` i powtórzeniami
  idempotentnymi) zwraca `GameView`.
- `TransfromInterceptor` i `HttpExceptionFilter` budują kopertę z adnotacją typów
  z `contracts`.
- `app.setup.ts` — `configureApp(app, frontendUrl)`: `cookieParser`, interceptor, filtr,
  CORS. Woła go `main.ts` i `test/test-app.ts`, więc e2e idą przez ten sam pipeline co
  produkcja. `main.ts` przerywa start, gdy brakuje `FRONTEND_URL` (dopisane do
  `.env.example`, wartość `http://localhost:8080`).

`apps/api/src/game/game.service.ts` — przepisany wokół jednego mechanizmu:

- `runAction(id, idempotencyKey, access, apply)` — wspólna ścieżka dla `join`/`start`/
  `roll`/`score`: sprawdzenie hosta (dla akcji `hostOnly`), wymagany `Idempotency-Key`,
  transakcja z powtórką po `EventLog`, `apply()` z walidacją i zapisami danej akcji,
  optymistyczna blokada, wpis do `EventLog`, a przy `P2002` zwrot wyniku zwycięskiego
  żądania. Plik zmalał o ok. 370 linii.
- Blokada optymistyczna to teraz `tx.game.update({ where: { id, revision }, include })`
  zamiast `updateMany` + `count === 1` + ponownego odczytu: brak dopasowania (`P2025`)
  zamieniany na `409`, a zaktualizowana gra z uczestnikami wraca z tego samego zapytania.
- `create()` nie sprawdza już `creationKey` przed zapisem — powtórkę łapie `P2002`
  i zwraca grę z uczestnikami (bez sekretu).
- `join` przechodzi przez `runAction`, więc też jest pod blokadą `revision`; `turnOrder`
  liczony z ostatniego uczestnika. Limit `MAX_PLAYERS` sprawdzany przy dołączaniu.
- `verifyHost` przy braku ciasteczka rzuca `403` przed liczeniem skrótu.
- Usunięte martwe `update()` / `remove()` i zakomentowane trasy w kontrolerze. Kontroler
  czyta ciasteczko przez `hostSecretFrom(request)`.
- **Świadomie bez zmian (decyzja właściciela):** `score()` nadal zapisuje karty wszystkich
  uczestników, choć reducer zmienia tylko jedną.

Testy:

- Wszystkie e2e czytają `body.data`. W `game-validation.e2e-spec.ts` test „obcy gracz
  zapisuje" brał wcześniej `id` gry zamiast id gracza (przechodził przypadkiem) — poprawiony.
- Nowy `test/game-contract.e2e-spec.ts` (23 testy): koperta sukcesu i błędu, dokładna lista
  pól `GameView`/`ParticipantView`, powtórka `create` bez nowego ciasteczka, `403` dla
  `start`/`roll`/`score` bez ciasteczka i z ciasteczkiem innej gry, limit 8 (create i join),
  walidacja wejścia (puste/spacje/za długie imię, nieznane pole, brak klucza, złe kości,
  nieznana kategoria), `trim` imion.
- `test/test-app.ts` ma helper `createGame(app, players, key)` (na razie używa go tylko nowy
  plik).
- Jest: testy jednostkowe przeszły z `ts-jest` na `@swc/jest` (CommonJS) — `ts-jest`
  kompilował `contracts/src` jako ESM, bo paczka ma `"type": "module"`. Obie konfiguracje
  mają jedno mapowanie `^@dice-app/(.*)$` na `packages/$1/src/index.ts`.
- `Dockerfile` kopiuje `package.json` z `contracts` i buduje wszystkie `./packages/*` jednym
  poleceniem.
- Wyniki: `game-core` 178/178, `api` typecheck zielony, jednostkowe 4/4, e2e 35/35.

`apps/web` — klient API:

- `src/app/api/client.ts` — `apiRequest<T>()`: bazowy URL, `credentials: 'include'`, świeży
  `Idempotency-Key` przy każdym nie-GET, rozpakowanie `data`, a przy błędzie `ApiError`
  (`statusCode` + komunikat z serwera).
- `src/app/api/games.ts` — `createGame`, `getGame`, `startGame`, `submitRoll`,
  `scoreCategory` (ta ostatnia **jeszcze niepodpięta w UI**).
- Komponenty i `useGame` biorą typy z `@dice-app/contracts`; `types/gameTypes.ts` trzyma
  już tylko `LocalRoll` (szkic kości na froncie). Usunięte `apiTypes.ts`,
  `createOfflineApi.ts`, `rollApi.ts`, `startApi.ts`. Przy okazji zniknął błąd typów
  w `offlineGameForm.tsx` (`CreateGameResponse` nie zgadzał się z tym, co zwraca API).
- Web typecheck zielony.

Stan uwag z przeglądu po tych zmianach:

- **Rozwiązane:** 5 (kontrakty w Zod), 9 (`500` bez ciasteczka), 10 (CORS bez
  `FRONTEND_URL`), 14 (e2e na innej konfiguracji niż produkcja), 16 (kolizja `turnOrder`).
- **Częściowo:** 2 — limit 8 graczy jest, ale `join` nadal nie wymaga hosta (pozycja
  w `DO-USTALENIA.md`). 3 — `GET /games` zwraca już tylko `GameView`, ale nadal wszystkie
  gry, bez filtra i stronicowania (cel endpointu otwarty w `DO-USTALENIA.md`).
- **Bez zmian:** 1, 4, 6, 7, 8 (powtórka `create` zwraca grę, ale bez sekretu — host bez
  ciasteczka nadal nie odzyska dostępu), 11, 12, 13, 15, 17.

Dług, który zostaje z tej sesji:

- Rzutowania kolumn `Json` (`as DiceRoll`, `as ScoreCard`) są w dwóch miejscach
  (`game.view.ts` i `score()`), bez walidacji — uwaga 13 w nowym miejscu.
- Trzy starsze pliki e2e nie korzystają ze wspólnego helpera `createGame` — każda zmiana
  kształtu odpowiedzi to znowu edycja w wielu miejscach.
- `offlineGameForm.tsx` ma na sztywno `maxLength={50}` zamiast `PLAYER_NAME_MAX_LENGTH`
  (import wartości z `contracts` wciągnąłby Zod do paczki przeglądarki).
- Lint: Prettier zgłasza w `apps/api` setki błędów formatowania (końce linii CRLF, wcięcia
  w testach) — sprzed tej sesji, nieruszane.
- `.env.example` nadal nie wymienia `NEXT_PUBLIC_API_URL` (jest w
  `apps/web/.env.local.example`).
- Kryterium „restart serwera w połowie niczego nie psuje" nadal nieprzećwiczone.

## Wynik końcowy i log gry — 2026-09-25

PR #5 (`api/event-log-and-totals`, scalony do `main`). Decyzje: `DECYZJE.md` §13.

`packages/game-core`:

- Nowy `src/totals.ts`: `upperSectionSum`, `upperBonus`, `totalScore` oraz stałe
  `UPPER_BONUS_THRESHOLD = 63`, `UPPER_BONUS_VALUE = 35`. Puste kategorie liczą się jako 0,
  więc funkcje działają też w trakcie gry (front może z nich brać postęp bonusu „53/63").
  `UPPER_CATEGORIES` w `validation.ts` jest teraz eksportowane (poza `index.ts`).
- `src/totals.test.ts` (14 testów, wyprowadzone z `ZASADY-GRY.md`): dokładnie 63, 62, zero
  w górnej sekcji, punkty dolnej sekcji nie liczą się do progu, bonus przed zapełnieniem karty.

Baza i API:

- Migracja `20260925115151_add_participant_final_score`: `Participant.finalScore Int?`
  i `Participant.upperBonus Int?`. Zapisywane w `score()` w tej samej transakcji, w której gra
  przechodzi w `COMPLETED` — zapis partii takiej, jaka była (zmiana zasad nie przeliczy
  historii); z tych pól ma czytać etap 8.
- `ParticipantView` dostał `finalScore` / `upperBonus` (`number | null`); `toGameView`
  wypełnia je tylko przy `COMPLETED`, w trakcie gry idą `null`.
- `payload` zdarzenia `saveCategory` ma teraz `points` — przeliczone przez reducer, nie od
  klienta.
- Nowy `GET /games/:id/events?after=<revision>` (`gameEventsQuerySchema` w `contracts`,
  mapowanie w nowym `src/game/game-event.view.ts` — `PUBLIC_EVENT_TYPES`,
  `toGameEventView`). Wychodzą tylko `gameStarted`, `diceConfirmed` (5 kości)
  i `categorySaved` (kategoria + punkty); `playerJoined` zostaje w bazie. `after` ma od razu
  posłużyć do dosyłania zmian po ponownym połączeniu (§10). Stare zdarzenia bez punktów
  wracają z `points: null`. Dostęp jak w `GET /games/:id` — kto zna `id`, ten czyta.

Testy:

- Nowy `test/game-results.e2e-spec.ts` (8 testów): wynik z bonusem (196) i bez (143), wynik
  ukryty w trakcie gry, zdarzenia i ich kolejność, `after`, brak `playerJoined`, `400` przy
  złym `after`, `404` dla nieznanej gry. Odpowiedzi czytane przez typy z kontraktu
  (`ApiResponse<GameView>`, `GameEventView[]`) — bez `any`.
- `game-contract.e2e-spec.ts`: lista pól uczestnika uzupełniona o dwa nowe.
- Wyniki: `game-core` typecheck + testy zielone, `api` typecheck, jednostkowe 4/4, e2e 43/43;
  `contracts` i `web` typecheck zielone na nowym kontrakcie.

Przy pisaniu testu wyszła luka w `ZASADY-GRY.md`: silnik liczy karetę (i generała) jako „dwie
pary". Właściciel potwierdził, że tak ma być — reguła dopisana do zasad, kod bez zmian.

Stan uwag z przeglądu po tych zmianach:

- **Rozwiązane:** 4 (suma i bonus liczone na serwerze, wynik końcowy zapisany).
- **Częściowo:** 6 — `saveCategory` ma punkty, a kości są w osobnym `diceConfirmation`, więc
  partię da się odtworzyć; nadal brak indeksu `@@index([gameId, revisionAfter])`, a nowy
  endpoint filtruje dokładnie po tych kolumnach.

Decyzje właściciela z 2026-09-25 (w `DECYZJE.md` §3 i §5, jeszcze **niezaimplementowane**):

- `join` w trybie lokalnym woła tylko host — trzeba dodać `verifyHost` (domyka uwagę 2).
- Host prowadzi jedną grę naraz; przy próbie założenia nowej gry offline — przekierowanie do
  niedokończonej. Jedno ciasteczko `host_secret` na urządzenie zostaje (część uwagi 7).
- Nadal otwarte: `maxAge` ciasteczka hosta (wiąże się z czasem wygasania gry, etap 6).

Dług, który zostaje z tej sesji:

- Brak indeksu `[gameId, revisionAfter]` na `EventLog` (patrz uwaga 6).
- `toGameEventView` ufa kształtowi `payload` (`as StoredPayload` i `!`) — kolejne rzutowanie
  kolumny `Json` bez walidacji, jak w uwadze 13.
- Starsze pliki e2e nadal używają `any` z `response.body`; nowy plik pokazuje wzorzec
  (`gameFrom` / `eventsFrom`).
- Endpointu „opuść grę" nie ma — „Leave game" w UI zostaje na razie bez działania.
- Kryterium „restart serwera w połowie niczego nie psuje" nadal nieprzećwiczone.
