# Etap 4 — Frontend gry lokalnej ← **TO JEST MVP**

Nowa gra, dodawanie graczy-gości, tabela wyników, wpisywanie kości fizycznych, koniec gry,
podsumowanie. Adres `/game/[id]`, więc odświeżenie działa z automatu.

**Gotowe gdy:** da się realnie rozegrać partię przy stole z żywymi ludźmi.

> **Tu następuje przerwa.** Właściciel gra kilka partii i zgłasza poprawki, zanim ruszamy dalej.

**Postęp: W TRAKCIE (stan na 2026-09-25).** Są komponenty prezentacyjne do ekranu gry
w nowym designie; ekran nie jest jeszcze z nich złożony ani podpięty pod API.

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

Dług / do zrobienia w tym etapie:

- Złożenie ekranu: tabela wyników (nieruchoma kolumna nazw, szerokości kolumn, wiersz bonusu
  z postępem „53/63", Esc / klik obok anuluje wybór, miejsce na ptaszek przy ostatniej
  kolumnie), układ trzy / dwie / jedna kolumna, szuflada.
- Podpięcie API: zatwierdzenie kości, zapis kategorii (dziś `console.log`), Game log
  (`GET /games/:id/events`), wynik na koniec (`finalScore`).
- „Leave game" i kod gry w górnym pasku zostają na razie bez działania (brak endpointu;
  krótki kod to etap 6). Przekierowanie hosta do niedokończonej gry (`DECYZJE.md` §5).
- Przestylowanie tworzenia gry i lobby; usunięcie `/dev/ui` i starego `gameScoreBoard/`.
- Kolory spoza tokenów: `text-[#cfc6ea]` w `TurnPill`, `bg-white/55` / `bg-white/70`.
- Kontrast `ink-faint` (~2,3:1) poniżej WCAG AA — wynika z palety, do decyzji właściciela.
- `metadata` w `layout.tsx` nadal „Create Next App".
