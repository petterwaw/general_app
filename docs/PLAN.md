# Plan realizacji

Etapy realizuję **sam i po kolei** (patrz „Tryb pracy" w `CLAUDE.md`). Nie przechodzę do
kolejnego, dopóki poprzedni nie ma spełnionego kryterium „gotowe gdy".

**Claude:** ten plan służy Ci do orientacji, gdzie jestem i czego jeszcze nie powinienem
dotykać — nie jako lista zadań do wykonania. Jeśli pytam o coś z dalszego etapu, zwróć mi na to
uwagę. Rzeczy oznaczonych POZA MVP nie proponuj.

---

## Etap 0 — Specyfikacja zasad *(zadanie właściciela, nie Claude'a)*

Wypełnić `ZASADY-GRY.md`: wariant, wszystkie kategorie, wzory na punkty, bonus, remisy.

**Gotowe gdy:** w `ZASADY-GRY.md` nie ma ani jednego „DO USTALENIA".

---

## Etap 1 — Fundament

Monorepo (pnpm workspaces), ESLint, Prettier, wspólny tsconfig, Docker Compose z PostgreSQL
lokalnie, pusty endpoint w `apps/api` i jeden ekran w `apps/web`, który go woła.

**Gotowe gdy:** jedna komenda odpala front i backend, i one się widzą.

---

## Etap 2 — Silnik gry (`packages/game-core`)

Czysty TypeScript. Zero bazy, zero HTTP, zero zależności zewnętrznych.

- funkcja punktująca: `(kategoria, kości) => punkty`
- reducer `(stan, akcja) => nowyStan`, który **waliduje legalność ruchu**: czy to tura tego
  gracza, czy kategoria jest wolna, czy nie ma czwartego rzutu, czy odłożone kości są z bieżącego
  rzutu
- rozdzielenie szkicu tury od zatwierdzonego zdarzenia (patrz `DECYZJE.md` §4)

To jest najważniejsza paczka w projekcie i jedyna z pokryciem testami bliskim 100%.

**Gotowe gdy:** w teście da się rozegrać całą partię od początku do końca, bez UI i bez bazy.

**Postęp: KRYTERIUM SPEŁNIONE.** `reducer.test.ts`, blok „reducer — pełna partia" rozgrywa
całą partię dwóch graczy od `createInitialState` do `isGameOver === true` — samym reducerem,
bez UI i bez bazy. Po drodze test wymusza jedną rundę forced zero (zapis do `pair`, zanim
sekcja dolna się odblokuje).

Stan pakietu `packages/game-core`:

- **`types.ts`** — `Category` (15 kategorii), `DieFace` (`1|2|3|4|5|6`), `DiceRoll` (krotka
  pięciu ścianek), `ScoreCard` (`Record<Category, number | null>`).
- **`scoring.ts`** — wszystkie 15 kategorii + `dispatchPoints`.
- **`validation.ts`** — `isCategoryFree`, `isLowerSectionUnlocked`, `isRollScoringInCategory`,
  `isForcedZero`, `canWriteChance`, `isLowerSectionCategory`. Przypisanie kategorii do sekcji
  trzyma `CATEGORY_SECTION: Record<Category, Section>` — jedyne źródło prawdy, wymusza
  kompletność: dodanie kategorii do `Category` bez wpisu tutaj nie skompiluje się.
- **`reducer.ts`** — jedna akcja: `saveCategory`. Stan adresuje graczy po `id` (string), nie po
  indeksie w tablicy. Wyeksportowane: `Player`, `GameState`, `Action`, `createInitialState`,
  `isPlayerTurn`, `nextPlayerId`, `isGameOver`, `reducer`. Prywatne: `createEmptyScoreCard`,
  `findPlayer`, `applySaveCategory`.

**Testy: 87 przypadków, wszystkie przechodzą, pokrycie 100%** (statements / branches /
functions / lines).

Rozstrzygnięcia z rozmów, utrwalone w kodzie:

- Zmiana tury jest **automatyczna** — dzieje się wewnątrz `reducer` przy `saveCategory`
  (`nextPlayerId` na końcu `applySaveCategory`), nie jest osobną akcją wywoływaną przez hosta.
- Akcja niesie **kości i kategorię, nigdy gotowego wyniku** — reducer przelicza punkty sam
  (patrz `DECYZJE.md` §4).
- `chance` jest wyjątkiem od blokady sekcji dolnej — **dopisane do `ZASADY-GRY.md`**, dokument
  zgadza się z kodem.
- `isForcedZero` w reducerze pełni rolę wyłącznie bramki rzucającej błąd; sam wynik `0` wynika
  z tego, że kategoria dolna jest zablokowana. Na froncie (etap 4) ta sama funkcja będzie
  potrzebna do rozróżnienia „0 pkt, ale możesz tu wpisać" od „zablokowane, nie klikaj".

**Dług do spłacenia przed etapem 3** (nie blokuje zamknięcia etapu 2):

- Repo **nie ma sprawdzania typów**. Brak `tsconfig.json` w pakiecie, brak TypeScriptu
  w zależnościach, a Vitest typów nie sprawdza (esbuild je wycina). Skutek: błąd typu przechodzi
  przy zielonych testach. Stan na teraz: `tsc --noEmit --strict` zgłasza **1 błąd** w
  `reducer.test.ts` (celowo niezgodny typ akcji w teście bezpiecznika `default`, bez jawnej
  furtki `@ts-expect-error`).
- Pakiet **nie jest importowalny z zewnątrz** — brak `index.ts` oraz pól `main` / `exports` /
  `types` w `package.json`. `apps/api` nie zaciągnie go w obecnej postaci.
- Brak funkcji liczącej **sumę karty i bonus sekcji górnej** (próg 63, wartość 35 wg
  `ZASADY-GRY.md`) oraz wyłaniania zwycięzcy (remis = kilku wygranych). Potrzebne na ekran
  podsumowania w etapie 4, nie wcześniej.
- `canWriteChance` duplikuje `isCategoryFree(card, 'chance')` — do rozważenia usunięcie.
- Błędy reducera to `new Error` z polskim komunikatem. Na etapie 3 API musi je odróżniać, żeby
  zmapować na kody HTTP — rozróżnianie po treści stringa będzie kruche.

Uwaga: walidacja „czwarty rzut" / „kości z bieżącego rzutu" dotyczy tylko kości wirtualnych
(etap 7, POZA obecnym zakresem) — patrz `DECYZJE.md` §4.

---

## Etap 3 — API i baza

Schemat, migracje, endpointy: utwórz grę, dodaj uczestnika, wykonaj akcję, pobierz stan.
Obowiązkowo: `revision`, log zdarzeń, klucz idempotencji, `status` gry, `ostatniaAktywnosc`.

**Gotowe gdy:** partię da się rozegrać z Postmana, a restart serwera w połowie niczego nie psuje.

**Postęp: W TRAKCIE.** Zrobione: fundament pod bazę i szkielet API. Nie zrobione: żaden
z czterech endpointów (utwórz grę / dodaj uczestnika / wykonaj akcję / pobierz stan) —
kryterium "gotowe gdy" jeszcze niespełnione.

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

`apps/api/prisma/schema.prisma` — trzy modele, zwalidowane i zmigrowane:

- `Gra` — `status` (enum `StatusGry`: LOBBY/TRWA/ZAKONCZONA/PORZUCONA/WYGASLA), `revision`,
  `ostatniaAktywnosc`, `dataUtworzenia`, relacja do listy `uczestnicy` oraz osobna, nazwana
  relacja `aktualnyGracz` (z `@unique` na FK, żeby to była prawdziwa relacja 1-do-1).
- `Uczestnik` — `imie`, `kartaWynikow` jako **JSON** (mapuje się 1:1 na `ScoreCard` z
  game-core; wybrane zamiast osobnej tabeli per-kategoria, bo agregaty globalne i tak liczą
  się w tle, do osobnych tabel — patrz `DECYZJE.md` §9 — więc relacyjne query po kategoriach
  nigdy nie będzie potrzebne), `kolejnosc`.
- `LogZdarzen` — `typAkcji` (String, nie enum — dziś istnieje tylko `saveCategory`), `dane`
  (JSON, surowa akcja), `revisionPo`, `kluczIdempotencji` z unikalnością **złożoną**
  `@@unique([gameId, kluczIdempotencji])` (unikalność w obrębie gry, nie globalnie).
- Świadomie brak pola źródła kości (fizyczne/wirtualne) na `Gra` — na razie wyłącznie kości
  fizyczne, zgodnie z decyzją właściciela; dopisanie tego pola to etap 7.
- Pierwsza migracja: `20260908181305_init`, zastosowana, `prisma migrate status` potwierdza
  zgodność ze schematem.
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
- **Niezweryfikowane do końca:** `apps/api/src/main.ts` nie ładuje `dotenv/config` — Prisma 7
  robi to tylko dla procesu CLI (przez `prisma7.config.ts`), nie automatycznie dla działającej
  aplikacji. Serwer startuje bez błędu nawet bez `DATABASE_URL` w środowisku (adapter najwyraźniej
  łączy się leniwie), ale nie sprawdzone jeszcze na żywym zapytaniu do bazy — do zweryfikowania
  przy pierwszym endpoincie, który faktycznie odpyta Prismę.

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
- `apps/api/src/app.controller.spec.ts` odwołuje się do nieistniejącej metody `getHello()`
  (kontroler ma `getHealth()`) — pre-istniejący błąd ze scaffoldu, niezwiązany z pracą nad
  Prismą, niepoprawiony.

---

## Etap 4 — Frontend gry lokalnej ← **TO JEST MVP**

Nowa gra, dodawanie graczy-gości, tabela wyników, wpisywanie kości fizycznych, koniec gry,
podsumowanie. Adres `/game/[id]`, więc odświeżenie działa z automatu.

**Gotowe gdy:** da się realnie rozegrać partię przy stole z żywymi ludźmi.

> **Tu następuje przerwa.** Właściciel gra kilka partii i zgłasza poprawki, zanim ruszamy dalej.

---

## Etap 5 — Konta i goście

Logowanie, sesja gościa jako anonimowy token, przypięcie uczestnika partii do konta,
statystyki osobiste, ograniczenie „jedno konto = jedna aktywna gra" (indeks unikalny w bazie),
akcja „opuść grę", przekierowanie do aktywnej gry po wejściu na stronę.

---

## Etap 6 — QR i realtime

Gateway WebSocket, pokój na partię, krótki kod dołączania + QR na ekranie hosta, role
`HOST` / `GRACZ` / `OBSERWATOR` z egzekwowaniem uprawnień po stronie serwera, wyrzucanie gracza
przez hosta, obsługa ponownego połączenia po `revision`, zadanie cykliczne kasujące wygasłe gry.

**Gotowe gdy:** po wyłączeniu wifi na 30 sekund i włączeniu z powrotem wszystko zgadza się samo,
bez odświeżania strony.

---

## Etap 7 — Kości wirtualne

Losowanie wyłącznie po stronie serwera. Animacja na froncie to odtworzenie wyniku, który już
przyszedł z API. Oznaczenie w bazie, czy partia była na kościach fizycznych czy wirtualnych.

---

## Etap 8 — Statystyki globalne

Tabele agregatów przeliczane zadaniem w tle. Do rankingu wchodzą wyłącznie uczestnicy z `userId`,
z gier o statusie `ZAKONCZONA`, rozegranych na kościach wirtualnych.

---

## Etap 9 — Tryb online *(POZA MVP)*

Matchmaking (min. 2, maks. 5 graczy), lobby, start po odczekaniu, limit 90 s na turę egzekwowany
zadaniem cyklicznym, wyrzucanie po dwóch przekroczeniach, kończenie gry przy jednym pozostałym
graczu ze statusem `PORZUCONA`. Redis (pub/sub) dopiero przy więcej niż jednej instancji API.

---

## Etap 10 — Utwardzanie

Rate limity, Sentry, kasowanie porzuconych gier, PWA.

---

## Świadomie POZA MVP — nie implementować

- Tryb online i matchmaking (etap 9)
- Przekazanie roli hosta innemu urządzeniu
- Zaliczanie wygranej przy porzuconej grze po progu 10/15 kategorii
- Statystyki gościa zapisywane po tokenie urządzenia
- Boty / gra z komputerem *(nigdy nie było omawiane — nie zakładaj, że mają być)*
