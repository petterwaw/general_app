# Etap 4 — Frontend gry lokalnej ← **TO JEST MVP**

Nowa gra, dodawanie graczy-gości, tabela wyników, wpisywanie kości fizycznych, koniec gry,
podsumowanie. Adres `/game/[id]`, więc odświeżenie działa z automatu.

**Gotowe gdy:** da się realnie rozegrać partię przy stole z żywymi ludźmi, a restart serwera
w połowie partii niczego nie psuje (przeniesione z etapu 3, 2026-09-25).

> **Tu następuje przerwa.** Właściciel gra kilka partii i zgłasza poprawki, zanim ruszamy dalej.

**Postęp: W TRAKCIE (stan na 2026-09-26).** Ekran gry w trakcie partii jest złożony
z komponentów i podpięty pod API w zakresie zatwierdzenia kości i zapisu kategorii (gałąź
`ui/game-screen`). Doszły (gałąź `ui/wire-api`, PR #8): wyjście z gry, ekran `/games` w nowym
designie i karta niedokończonej gry hosta. Zakończona gra zostaje na ekranie gry z zablokowanymi
kośćmi. Log gry pod graczami i ekran gry dopasowany do telefonów (`f1338c3`). Brakuje ekranu
końca z wynikami i przestylowania lobby.

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
`sr-only` *(„???” usunięte 2026-09-26)*. Sprawdzone w przeglądarce: brak przesunięcia komórki i fokus na ptaszku;
szuflada (Esc, powrót fokusu) sprawdzona ręcznie.

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
- Podpięcie API: ~~Game log~~ — zrobione (2026-09-26, wpis niżej); ekran końca gry z `finalScore` (`gameView.tsx` przy `COMPLETED`
  pokazuje na razie zwykły ekran gry z zablokowanymi kośćmi — wpis z 2026-09-26). „Leave game”
  i niedokończona gra hosta — zrobione, wpis niżej.
- Przestylowanie lobby (tworzenie gry — zrobione, wpis niżej).
- ~~Ptaszek przy zaznaczonym polu w ostatniej kolumnie wystaje poza komórkę.~~ — w ostatniej
  kolumnie jest po lewej stronie pola (2026-09-26, wpis niżej).
- Kolory spoza tokenów: `text-[#cfc6ea]` w `TurnPill`, `bg-white/55` / `bg-white/60`.
- Kontrast `ink-faint` (~2,3:1) poniżej WCAG AA — wynika z palety, do decyzji właściciela.
- `metadata` w `layout.tsx` nadal „Create Next App”.

## Wywołania API, wyjście z gry i ekran `/games` — 2026-09-25

Gałąź `ui/wire-api`.

- `api/games.ts` — nowe `leaveGame`, `joinGame`, `getHostedGame` (`GameView | null`),
  `getGameEvents(gameId, after?)` (`?after=` doklejane tylko przy podanej wartości, także 0),
  `removeParticipant` (`DELETE`). `client.ts` przyjmuje `DELETE`; klucz idempotencji dostaje
  każda metoda poza `GET`. *(Stan na 2026-09-26: użyte są wszystkie — `joinGame`
  i `removeParticipant` w lobby, `getGameEvents` w logu gry.)*
- `gameScreen.tsx` — „Leave game” woła `leaveGame` przez `run()`; przekierowanie na `/games`
  jest w akcji przekazanej do `run`, więc wykonuje się tylko po sukcesie. `run()` blokuje
  równoległe żądania refem (`pendingRef`) zamiast stanu, bo `pending` ze `useState` zmienia się
  dopiero przy następnym renderze i szybkie podwójne kliknięcie przeszłoby dwa razy. Przycisk
  jest nieaktywny w trakcie żądania. *(Zmienione 2026-09-26: wyjście nie idzie już przez
  `run()` — wpis niżej.)*
- `hooks/useHostedGame.ts` — `GET /games/hosted` przy wejściu; „brak gry” (`null`) od „jeszcze
  nie wiem” odróżnia `loading`.
- `/games` (`games/page.tsx`) — ekran startowy z „Create game” i „Join game”; „Create game”
  pokazuje przełącznik trybu z formularzem (wstecz: ‹). „Join game” i opcja „Online” są
  wygaszone z dymkiem „Coming soon” (`ui/comingSoon.tsx`, Tooltip z Base UI) — dołączanie
  kodem to etap 6, online jest POZA MVP. Formularz offline: licznik `n/8`, „+ Add player” jako
  sam napis (nieaktywny przy `MAX_PLAYERS`), X przy każdym graczu poza pierwszym. *(Zmienione
  w `b7e29f4`: formularz tworzenia pyta tylko o imię hosta i tryb, graczy dodaje się w lobby —
  `createGameForm.tsx`, `gameLobby.tsx`, `playerNameRow.tsx`.)*
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

- ~~Kolory graczy nie trafiają do CSS~~ — naprawione tego samego dnia: Tailwind v4 nie wypisywał
  `--color-player-*` (używane tylko przez `style`). Tokeny usunięte; jedno źródło to
  `PLAYER_COLORS` (oklch) w `playerColors.ts`, z którego awatar bierze odcień, a `LogItem`
  pełny kolor. Odcienie awatarów przesunęły się o kilka stopni (dopasowane do dawnych hexów).
- Błędy wyjścia na `/games` (`leaveError`) i błąd `useHostedGame` nie są wyświetlane — czekają
  na wspólny komponent komunikatów (np. toast). `createGame` przy błędzie tylko loguje.
- Czy przed wyjściem z gry ma być potwierdzenie — nieustalone.
- Usuwany gracz znika bez animacji; wysokość karty skacze.
- Formularz online nie ma logiki (i jest dziś nieosiągalny).

## Zakończona gra i poprawki skaczącego ekranu — 2026-09-26

Na `main` (commity `7cc4df8`, w PR #8, i `102c469`).

- **Zakończona gra** — `gameView.tsx` przy `COMPLETED` renderuje `GameScreen` zamiast napisu
  „Game completed”. Ekran zostaje taki, jak po ostatniej kategorii; `DiceEntry` dostało prop
  `disabled` (taca widoczna, wpisywanie zamknięte). „Leave game” w zakończonej grze tylko wraca
  na `/games` — serwer i tak odmawia porzucenia zakończonej gry. To stan przejściowy do czasu
  ekranu końca z wynikami.
- **Tabela skakała po „Confirm” i po zapisie kategorii** — podpowiedź (`pill` w
  `scoreCell.tsx`) miała `py-0.5`, więc była ~4 px wyższa niż `–` w pustej komórce i każdy
  wiersz z podpowiedzią rósł. Dodane `-my-0.5`: pigułka wygląda tak samo, ale w układzie nie
  jest wyższa od tekstu. Zasada jak przy stanie `selected`: zmiana stanu komórki nie może
  zmieniać jej wymiarów.
- **„Leave game” migał co turę** — miał `disabled={pending}`, a `pending` ustawia `run()` przy
  każdej akcji (`roll`, `score`), więc przycisk na chwilę szarzał. Teraz ma własny stan
  `leaving`.
- **Mignięcie „Game is no longer available” przy wyjściu** — `run()` przekazywało grę
  `ABANDONED` do `onGameChange`, a `gameView.tsx` przerysowywał się, zanim `router.push`
  załadował `/games`. `leaveGameSubmit` nie idzie już przez `run()`: woła `leaveGame`
  i nawiguje, nie ruszając stanu gry. Po sukcesie `leaving` i `pendingRef` zostają ustawione,
  żeby do zmiany ekranu nic innego nie ruszyło; przy błędzie komunikat jak przy innych akcjach.

Porzucony prototyp animowanego odsłaniania wyników (`/dev/reveal`) nie trafił do repo.

Sprawdzone: typecheck `web` zielony, lint bez błędów (3 stare ostrzeżenia o nieużywanych
zmiennych). **W przeglądarce nie sprawdzano** poprawek z `102c469`.

Dług / do zrobienia:

- `leaveGameSubmit` powtarza część logiki `run()` (blokada, błędy), bo `run()` zakłada, że akcja
  zwraca nową grę. Przy kolejnym takim wyjątku — dopuścić w `run()` akcję bez wyniku.
- Ekran końca gry z `finalScore` / zwycięzcą — nadal do zrobienia.

## Log gry i ekran gry na telefonach — 2026-09-26

Na `main` (commit `f1338c3`).

- **Log gry** — `hooks/useGameLog.ts` pobiera `GET /games/:id/events` przy wejściu, a przy każdej
  nowej `revision` tylko `?after=<ostatnia znana>` (ten sam mechanizm posłuży do dosyłania
  zdarzeń po ponownym połączeniu, etap 6). Wyprzedzone żądanie jest porzucane, nowsze startuje
  od tego samego punktu, więc nic się nie dubluje. Błąd pobrania jest cichy — ponowienie przy
  następnej `revision`.
- `gameLog/gameLog.tsx` — wpisy pod graczami, na tle, najnowszy na górze: „Game started”,
  „Anna rolled 6 6 6 2 3”, „Anna scored 18 in Sixes” (zero na czerwono). Nowe wpisy wsuwają się
  animacją `log-in` (450 ms, `globals.css`, bez niej przy `prefers-reduced-motion`); wpisy
  z pierwszego pobrania bez animacji. Log się nie przewija: co się nie mieści, jest ucięte, a dół
  zanika maską (działa też na tle szuflady). `LogItem` — `seat` opcjonalny (neutralna kropka),
  godzina w `ink-muted`.
- `players/playersPanel.tsx` — log ma min. 30vh, gracze resztę i przewijają się, gdy się nie
  mieszczą; zanikanie u góry / u dołu, gdy tam są ukryci gracze. Dotyczy szuflady i trzeciej
  kolumny (panel jest wspólny).
- `PlayerRow` — bez „???” z kłódką w trakcie gry (suma pojawia się dopiero przy `COMPLETED`)
  i bez znaczka „Host” (w trybie lokalnym niepotrzebny; `role` zostaje dla uprawnień).
- **Przewijanie strony w bok przy wielu graczach** — etykiety `sr-only` w komórkach tabeli są
  `position: absolute`, a kontener tabeli nie był pozycjonowany, więc wystawały poza stronę
  zamiast poza tabelę (przy 8 graczach strona 667 px przy oknie 485 px). Kontener dostał
  `relative`.
- **Tabela** (`scoreCard.tsx`) — w nagłówku same awatary (imię w `title` i `sr-only`); kółko
  myszy przesuwa graczy w poziomie (na krawędzi przepuszcza przewijanie strony); przy zmianie
  tury tabela płynnie wyrównuje aktywnego gracza do lewej, za nazwami kategorii (przy wejściu
  bez animacji). Ptaszek w ostatniej kolumnie jest po lewej stronie pola (`tickOnLeft`
  w `ScoreCell`), bo kontener ucinał go po prawej.
- **Suwaki** — klasa `scrollbar-soft` w `globals.css` (tabela, lista graczy): na ekranach
  dotykowych brak, z myszą cienki, zaokrąglony, w kolorze `felt`, bez strzałek. Suwak tabeli
  zaczyna się za kolumną nazw (`--scrollbar-inset`).
- `gameScreen.tsx` — w układzie dwu- i jednokolumnowym „Leave game” i „Players” są w wierszu nad
  siatką, przy krawędziach ekranu, a nie w kolumnie tacy. `TurnPill` poniżej 340 px ma
  `scale-90`.

Sprawdzone w przeglądarce (Chrome, gry testowe z 4–8 graczami, porzucone po pomiarach): brak
przewijania w bok, log 30vh i przewijani gracze w szufladzie, kółko nad tabelą, wyrównanie
aktywnego gracza przy wejściu, suwak pod kolumnami graczy, ptaszek w ostatniej kolumnie,
przyciski przy krawędziach przy ~768 px, `scale` pigułki przy 320 px. Typecheck `web` zielony,
lint bez błędów.

Czego nie sprawdzono: płynnej animacji wyrównania przy zmianie tury i wysuwania szuflady (karta
Chrome w tle nie odtwarza animacji), zanikania u góry listy graczy, prawdziwego telefonu.

**Pułapka testów w Chrome:** karta w tle (`document.visibilityState === 'hidden'`) nie odtwarza
animacji ani `scrollTo({ behavior: 'smooth' })` — szuflada „stoi” w połowie wysuwania. Pomiary
układu działają, animacji trzeba patrzeć ręcznie.

Dług / do zrobienia:

- W Firefoksie suwak tabeli jest na całą szerokość — nie da się skrócić toru bez
  `::-webkit-scrollbar`.
- Na komputerze otwarcie szuflady chowa pasek przewijania strony (szerokość rośnie o ~15 px);
  `scrollbar-gutter` nie pomaga przy blokadzie przewijania z Base UI.
- `formatTime` jest w dwóch miejscach (`gameLog.tsx`, `gameLobby.tsx`).
- W układzie dwukolumnowym wiersz przycisków nad siatką zabiera ok. 48 px wysokości tabeli
  i tacy.
- Nieużywane: `LockIcon` (`ui/icons.tsx`), prop `isGuest` w `PlayerRow` (przyda się przy
  kontach).
- `DESIGN.md` nie opisuje jeszcze tych zmian (wiersz „Suma punktów” mówi o „???” z kłódką).
