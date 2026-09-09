# Etap 2 — Silnik gry (`packages/game-core`)

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
