# Etap 4 — Frontend gry lokalnej ← **TO JEST MVP**

Nowa gra, dodawanie graczy-gości, tabela wyników, wpisywanie kości fizycznych, koniec gry,
podsumowanie. Adres `/game/[id]`, więc odświeżenie działa z automatu.

**Gotowe gdy:** da się realnie rozegrać partię przy stole z żywymi ludźmi, a restart serwera
w połowie partii niczego nie psuje (przeniesione z etapu 3, 2026-09-25).

> **Tu następuje przerwa.** Właściciel gra kilka partii i zgłasza poprawki, zanim ruszamy dalej.

**Postęp: W TRAKCIE (stan na 2026-09-25).** Ekran gry w trakcie partii jest złożony
z komponentów i podpięty pod API w zakresie zatwierdzenia kości i zapisu kategorii (gałąź
`ui/game-screen`). Doszły (gałąź `ui/wire-api`): wyjście z gry, ekran `/games` w nowym
designie i karta niedokończonej gry hosta. Brakuje logu gry, ekranu końca i przestylowania
lobby.

## Komponenty UI — 2026-09-25

PR #4 (`ui/components-base`, scalony do `main`). Wzorzec: `docs/design/prototyp.html`
i `DESIGN.md`. Nic nie woła API — ekran ma być najpierw złożony z tych klocków, potem
podpięty.

`apps/web/src/app/components/`:

- `ui/` — `Button` (warianty `primary` / `secondary` / `ghost` / `danger`, rozmiary `md` /
  `lg` / `top`), `IconButton`, `DrawerHandle` („Players ‹"), `Drawer` (Base UI Dialog, z
  prawej, Esc / tło / krzyżyk), `Card` (prop `padding`), `Input` (`rounded-tile`), `Badge`,
  `icons.tsx`.
- `dice/` — `Die` (wartość / puste pole / zaznaczenie / mini), `DiceTray` (rant + sukno),
  `DiceSlots` (5 pól), `DicePicker` (6 kości), `TurnPill`. Rozmiar kości z szerokości kolumny
  (`cqi`), taca wymaga `@container` u rodzica.
- `players/` — `Avatar` (blobatar, seed = ID uczestnika, odcień wg miejsca), `PlayerRow`
  (suma „???" z kłódką albo liczba), `playerColors.ts`.
- `scorecard/ScoreCell` — wszystkie stany komórki z `DESIGN.md`. Ptaszek jest poza
  przepływem, żeby zaznaczenie nie zmieniało szerokości komórki (inaczej przesuwały się
  liczby i sąsiednie kolumny).
- `gameLog/LogItem`, `topBar/TopBar`.
- `globals.css`: globalne `:focus-visible` i `@utility` na tła wielowarstwowe
  (`bg-tray-wood`, `bg-felt-cloth`, `bg-die-face`, `bg-locked-stripes`).
- Nowa zależność: `blobatar` + `@blobatar/react` 2.7.0 (ustalona w `DESIGN.md`).
- Bez `tailwind-merge`: tam, gdzie klasa z zewnątrz gryzłaby się z wariantem, rozmiar idzie
  przez prop albo zmienną CSS (`--icon-btn-size`, `--brand-die`).
- `offlineGameForm.tsx`: „+" przeszło na `IconButton`.

Dostępność: fokus przechodzi na ptaszek po wybraniu kategorii (`autoFocus`), grupy z
`aria-label` mają `role="group"`, awatar obok widocznego imienia ma `alt=""`, mini kość jest
ukryta przed czytnikiem, komórki z kreską czytają „Open" / „Locked", suma „???" ma tekst
`sr-only`. Sprawdzone w przeglądarce: brak przesunięcia komórki i fokus na ptaszku;
szuflada (Esc, powrót fokusu) sprawdzona ręcznie przez właściciela.

`/dev/ui` — tymczasowa strona z komponentami na danych przykładowych.

Dług przeniesiony niżej, do wpisu „Ekran gry”.

## Ekran gry — 2026-09-25

Gałąź `ui/game-screen`. Ekran `IN_PROGRESS` złożony z komponentów z PR #4; stary
`gameScoreBoard/`, `offlineGames/` i `/dev/ui` usunięte.

- `scorecard/scoreCard.tsx` — tabela: przyklejona kolumna nazw, szerokości kolumn liczone
  w JS (co najmniej 3,5 gracza w widoku, gdy tabela się przewija), wiersz Bonus z postępem,
  Chance osobno na dole, zaznaczenie anulowane Esc / klikiem obok. Podpowiedzi punktów tylko
  u aktywnego gracza i dopiero po zatwierdzeniu kości; zablokowana dolna sekcja przyjmuje
  wymuszone zero. Liczone funkcjami z `game-core` (nowe eksporty: `dispatchPoints`,
  `isCategoryFree`, `isLowerSectionUnlocked`, `isLowerSectionCategory`, `isForcedZero`) —
  serwer i tak przelicza.
- `dice/diceEntry.tsx` — wpisywanie kości + „Confirm” (`POST /roll`). Szkic kości resetuje się
  przy każdej nowej `revision`.
- `game/gameScreen.tsx` — trzy tryby układu (logika przeniesiona z prototypu), zapis kategorii
  (`POST /score`), błąd z API pod przyciskiem. Numer rundy w pasku tury liczony na froncie
  z wypełnionych kategorii — tylko do wyświetlania.
- `players/playersPanel.tsx`, `game/gameFrame.tsx` (ramka strony, poza folderem `[gameId]` —
  patrz niżej).
- Wygląd zmieniony względem prototypu (bez górnego paska, tabela przy lewej krawędzi, panel
  graczy bez karty, oczy awatarów za kursorem, tekst na różowym w kolorze `ink`) — opis
  w `DESIGN.md`.

Sprawdzone w przeglądarce: pełna tura hosta (kości → Confirm → wybór kategorii → ptaszek →
tura przechodzi dalej), błąd 403 bez ciasteczka hosta, tryby układu przy 375 / 916 / 1200 /
1440 px zgodne z `DESIGN.md`, brak przewijania w pionie w trybach kolumnowych.

**Pułapka dev serwera:** Next nie przebudowuje CSS Tailwinda po zmianach w plikach w folderach
z nawiasami (`app/games/[gameId]/`) — klasy dopisane tam pojawiają się dopiero po restarcie
`pnpm dev`. Dlatego klasy ramki strony są w `components/game/gameFrame.tsx`.

Dług / do zrobienia w tym etapie:

- **Poprawienie kości po „Confirm”** — serwer odrzuca drugi `roll` w tej samej turze („Roll
  was already made”), a `DECYZJE.md` §4 i `DESIGN.md` zakładają, że do zapisu kategorii kości
  są szkicem. Na razie UI blokuje kości po zatwierdzeniu. Wymaga zmiany w API.
- Podpięcie API (właściciel, w trybie nauki): Game log (`GET /games/:id/events`, `TODO`
  w `playersPanel.tsx`), ekran końca gry z `finalScore` (`gameView.tsx` przy `COMPLETED`
  pokazuje sam napis). „Leave game” i niedokończona gra hosta — zrobione, wpis niżej.
- Przestylowanie lobby (tworzenie gry — zrobione, wpis niżej).
- Ptaszek przy zaznaczonym polu w ostatniej kolumnie wystaje poza komórkę.
- Kolory spoza tokenów: `text-[#cfc6ea]` w `TurnPill`, `bg-white/55` / `bg-white/60`.
- Kontrast `ink-faint` (~2,3:1) poniżej WCAG AA — wynika z palety, do decyzji właściciela.
- `metadata` w `layout.tsx` nadal „Create Next App”.

## Wywołania API, wyjście z gry i ekran `/games` — 2026-09-25

Gałąź `ui/wire-api`. Wywołania API w `api/games.ts` i podpięcie „Leave game” oraz
niedokończonej gry napisał właściciel w trybie nauki; wygląd `/games` — Claude.

- `api/games.ts` — nowe `leaveGame`, `joinGame`, `getHostedGame` (`GameView | null`),
  `getGameEvents(gameId, after?)` (`?after=` doklejane tylko przy podanej wartości, także 0),
  `removeParticipant` (`DELETE`). `client.ts` przyjmuje `DELETE`; klucz idempotencji dostaje
  każda metoda poza `GET`. Na froncie użyte na razie tylko `leaveGame` i `getHostedGame`.
- `gameScreen.tsx` — „Leave game” woła `leaveGame` przez `run()`; przekierowanie na `/games`
  jest w akcji przekazanej do `run`, więc wykonuje się tylko po sukcesie. `run()` blokuje
  równoległe żądania refem (`pendingRef`) zamiast stanu, bo `pending` ze `useState` zmienia się
  dopiero przy następnym renderze i szybkie podwójne kliknięcie przeszłoby dwa razy. Przycisk
  jest nieaktywny w trakcie żądania.
- `hooks/useHostedGame.ts` — `GET /games/hosted` przy wejściu; „brak gry” (`null`) od „jeszcze
  nie wiem” odróżnia `loading`.
- `/games` (`games/page.tsx`) — ekran startowy z „Create game” i „Join game”; „Create game”
  pokazuje przełącznik trybu z formularzem (wstecz: ‹). „Join game” i opcja „Online” są
  wygaszone z dymkiem „Coming soon” (`ui/comingSoon.tsx`, Tooltip z Base UI) — dołączanie
  kodem to etap 6, online jest POZA MVP. Formularz offline: licznik `n/8`, „+ Add player” jako
  sam napis (nieaktywny przy `MAX_PLAYERS`), X przy każdym graczu poza pierwszym.
- `gameCreate/activeGameCard.tsx` — gdy host ma trwającą grę, zamiast Create / Join jest jedna
  karta: gracze, „Back to the game”, cichy napis „Leave game” (`DECYZJE.md` §5). Po wyjściu
  `setGame(null)` przywraca ekran tworzenia. Dopóki trwa sprawdzanie, ekran jest pusty.
- `globals.css` — tymczasowa animacja `animate-rise` (wejście z dołu, 220 ms) dla nowych
  wierszy i podmienianych kart; przełącznik trybu ma przesuwaną pigułkę. Bez animacji przy
  `prefers-reduced-motion`.

Sprawdzone w przeglądarce: wyjście z gry (po przebudowie kontenera API — patrz niżej), ekran
startowy, dymek „Coming soon”, karta niedokończonej gry i wyjście z niej. Telefonu nie
sprawdzano.

**Pułapka środowiska:** port 3000 zajmuje kontener `general_app-api-1` z `docker-compose.yml`.
Po zmianach w API trzeba go przebudować (`docker compose up -d --build api`), inaczej front
rozmawia ze starym kodem (tak było z `POST /leave` → „Cannot POST”).

Dług / do zrobienia:

- **Kolory graczy nie trafiają do CSS** — Tailwind v4 wypisuje tylko te zmienne z `@theme`,
  których używa jakaś klasa, a `playerColor()` podaje `--color-player-*` przez `style`.
  `LogItem` narysuje przezroczystą kropkę. Poprawka w `globals.css` (np. `@theme static`).
- Błędy wyjścia na `/games` (`leaveError`) i błąd `useHostedGame` nie są wyświetlane — czekają
  na wspólny komponent komunikatów (np. toast). `createGame` przy błędzie tylko loguje.
- Czy przed wyjściem z gry ma być potwierdzenie — nieustalone.
- Usuwany gracz znika bez animacji; wysokość karty skacze.
- Formularz online nie ma logiki (i jest dziś nieosiągalny).
