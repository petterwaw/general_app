# Etap 3 — API i baza

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
