# Projekt: aplikacja do gry w kości (wariant Yatzy)

## TRYB PRACY — najważniejsza sekcja tego pliku

**Priorytetem jest teraz tempo budowy projektu, nie nauka.** Kod piszesz Ty, ja robię review
tego, co powstaje. Tryb nauki włączam tylko wtedy, gdy o niego wprost poproszę.

### Kiedy piszesz kod

- **Piszesz kod, gdy o to proszę.** „Napisz X", „popraw Y", „uprość Z" — robisz to.
- **Pytania to nie są prośby o kod.** „Jak działa X?", „dlaczego Y?" — odpowiadasz, nie edytujesz.
- **Duże zmiany najpierw proponujesz.** Zanim ruszysz coś większego (nowa funkcja, kilka plików,
  zmiana schematu bazy, zmiana architektury, nowa zależność) — opisz krótko, co chcesz zrobić
  i jak, i **poczekaj na moją akceptację**. Małe, jednoznaczne poprawki rób od razu.

### Czego nie robisz bez pytania

- Nie „poprawiasz przy okazji" rzeczy spoza zakresu prośby — zauważone problemy wypisz na końcu.
- Nie refaktoryzujesz kodu, o który nie prosiłem.
- Nie dopisujesz funkcji spoza bieżącego etapu (`docs/STAN.md`, `docs/etapy/`).

### Tryb nauki — tylko na żądanie

Gdy poproszę o naukę (np. „wytłumacz mi to", „chcę to napisać sam", learning output style),
przechodzisz na drabinę pomocy: pytanie naprowadzające → wskazanie kierunku → wyjaśnienie
mechanizmu na abstrakcyjnym przykładzie → szkielet z lukami → pełne rozwiązanie. Wyżej wchodzisz
dopiero po mojej reakcji albo gdy poproszę o konkretny szczebel.

### Weryfikacja

- Po zmianach w kodzie uruchom typecheck i testy dotkniętej paczki i powiedz wprost, czy są
  zielone.
- Testy możesz pisać. Testy `packages/game-core` wyprowadzaj z `docs/ZASADY-GRY.md`, nie
  z implementacji — mają sprawdzać zasady, a nie to, co akurat zostało napisane.

### Code review

Kiedy proszę o przejrzenie kodu: wskaż problem i wytłumacz, dlaczego to problem. Poprawki nanosisz
dopiero, gdy o to poproszę. Sortuj uwagi od najważniejszych, rozdzielaj „to jest błąd" od „to
kwestia gustu" i mów wprost, które jest które. Wskaż też, co jest zrobione dobrze.

### Odpowiadaj po polsku

Kod, nazwy zmiennych, commity i komentarze w kodzie — po angielsku.

### Agenci i skille

- **`/commit`** — commit zgodny z konwencją tego repo (status/diff/log → wiadomość po
  angielsku → `git add` konkretnych plików, nigdy `-A`). Jeśli commit zamyka etap, skill
  przypomni o dopisaniu notatek postępu do `docs/etapy/etap-N.md`.
- **`/etap-postep`** — dopisuje notatkę postępu do bieżącego `docs/etapy/etap-N.md` (w stylu
  już istniejących wpisów) i aktualizuje status w `docs/STAN.md`. Pokazuje diff do akceptacji
  przed uznaniem za skończone — to nie jest commit, tylko aktualizacja dokumentacji.
- **`/etap-review`** — niezależny przegląd zaimplementowanego etapu (agent `etap-review`,
  odpalany w izolowanym kontekście — nie widzi historii rozmowy, w której powstawał kod).
  Sprawdza kryterium „gotowe gdy" z pliku etapu oraz jakość kodu wg zasad code review z tego
  pliku (błąd vs. gust, najważniejsze pierwsze, pochwały też). Nie nanosi poprawek.
- **Agent `doradca`** — gdy pytam o coś w formie otwartej/porównawczej ("jak to lepiej zrobić",
  "co polecasz X czy Y", pytanie o architekturę bez konkretnego błędu do naprawienia),
  deleguj sam, bez pytania mnie, do agenta `doradca` zamiast szukać odpowiedzi w tym oknie —
  żeby nie zaśmiecać kontekstu przeszukiwaniem kodu. **Nie dotyczy** to pytań z drabiny pomocy
  ("utknąłem na X", "nie działa mi Y") — tam eskalacja zależy od mojej reakcji krok po kroku i
  zostaje w tej rozmowie.

---

## ZASADA NADRZĘDNA co do zakresu

Dokumentacja w `docs/` zawiera **wyłącznie to, co zostało faktycznie ustalone**. Reszta jest
świadomie nierozstrzygnięta.

1. **Nie zgaduj i nie wymyślaj wartości domyślnych.** Jeżeli czegoś nie ma w `docs/`, sprawdź
   `docs/DO-USTALENIA.md`. Jeśli pozycja jest na tej liście — **zapytaj mnie**.
2. **Nie sugeruj funkcji, których nie ma w `docs/PLAN.md`.** Rzeczy oznaczone „POZA MVP" mają
   nie powstać, dopóki nie powiem inaczej — nawet jeśli wydają się łatwe.
3. **Pilnuj kolejności etapów.** Jeśli pytam o coś z etapu 6, a jestem na 3 — powiedz mi to.
4. Kiedy podejmę decyzję w rozmowie — **przypomnij mi, żebym dopisał ją do `docs/`**.
   Dokumentacja ma być jedynym źródłem prawdy.

---

## Kontekst

@docs/DECYZJE.md
@docs/STAN.md
@docs/DO-USTALENIA.md
@docs/ZASADY-GRY.md

Szczegóły każdego etapu (cel, kryterium „gotowe gdy", notatki postępu, dług) są w
`docs/etapy/etap-N.md` — nie są importowane automatycznie, żeby nie ładować całej historii
projektu na start każdej sesji. Czytaj tylko plik odpowiadający etapowi, którego dotyczy
bieżące pytanie (patrz `docs/STAN.md`).

## Skrót — co budujemy

Webowa aplikacja do gry w kości w wariancie Yatzy (5 kości, 3 rzuty na turę, karta kategorii).
Dwa tryby:

- **Tryb lokalny** — jedno urządzenie (host) prowadzi grę dla ludzi siedzących przy stole.
  Kości mogą być fizyczne (host wpisuje wyniki ręcznie) albo wirtualne (losuje serwer).
  Inni mogą dołączyć przez kod QR na własnych telefonach, ale **tylko do podglądu**.
- **Tryb online** — każdy gra u siebie, kości wyłącznie wirtualne. **POZA MVP.**

Konto jest opcjonalne. Bez konta też można grać (jako gość), ale statystyki globalne
zapisują się tylko zalogowanym.

## Zasada architektoniczna, od której nie ma odstępstw

**Serwer jest jedynym autorytetem.** Stan gry żyje w PostgreSQL, nie w pamięci procesu Node.
Klient niczego nie liczy i niczego nie rozstrzyga — wysyła akcje, dostaje stan, rysuje go.

Wynika z tego kilka twardych reguł. Jeśli zobaczysz, że je łamię — powiedz mi, nawet jeśli
akurat nie pytam:

- Żaden fragment logiki punktowania ani walidacji ruchu nie może istnieć wyłącznie na froncie.
- `Math.random()` po stronie klienta jest zakazany. Kości losuje wyłącznie serwer.
- Uprawnienia sprawdzamy na serwerze. Ukrycie przycisku w UI to nie jest zabezpieczenie.
- Timery i deadline'y trzymamy jako znaczniki czasu w bazie i egzekwujemy zadaniem cyklicznym.
  **`setTimeout` do odmierzania tur jest zakazany** — restart procesu kasuje timer.
- Restart serwera w trakcie partii nie może niczego zepsuć.

## Struktura repo

```
apps/web              # Next.js (App Router) — TYLKO warstwa prezentacji
apps/api              # NestJS — API, WebSockety, zadania cykliczne
packages/game-core    # zasady gry: czysty TypeScript, zero I/O, zero zależności
packages/contracts    # typy + schematy Zod wspólne dla web i api
docs/                 # dokumentacja projektu (patrz importy wyżej)
```

## Uwaga prawna

Aplikacja **nie może** nazywać się „Yahtzee" — to znak towarowy Hasbro. Nazwa produktu nie
została jeszcze wybrana. Do czasu wyboru w kodzie i konfiguracji: `dice-app`.
