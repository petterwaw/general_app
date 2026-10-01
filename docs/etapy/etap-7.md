# Etap 7 — Kości wirtualne

Losowanie wyłącznie po stronie serwera. Animacja na froncie to odtworzenie wyniku, który już
przyszedł z API. Oznaczenie w bazie, czy partia była na kościach fizycznych czy wirtualnych.

Tylko dla trybu online (ustalone 2026-09-28) — tryb lokalny zostaje na kościach fizycznych.
Serwer pilnuje maks. 3 rzutów i kości odkładanych między rzutami; reducer ma dla kości
wirtualnych osobny zestaw walidacji (`DECYZJE.md` §4).

Rozszerzone 2026-09-29: etap obejmuje backend gry online z etapu 9 — zakładanie gry bez
pełnego hosta (zakładający tylko startuje), dołączanie z własnego urządzenia, jedna aktywna gra
na urządzenie w obu trybach, uprawnienia po urządzeniu gracza (`DECYZJE.md` §2, §5). Kości
wirtualne istnieją tylko w grze online, więc bez tego nie da się rozegrać partii przez API.
Front gry online zostaje w etapie 9.

**Gotowe gdy:** partię na kościach wirtualnych 2+ graczy na osobnych urządzeniach da się
rozegrać do końca przez API, a zasady rzutów mają testy w `game-core` wyprowadzone
z `ZASADY-GRY.md`.

**Postęp: KRYTERIUM SPEŁNIONE** (2026-09-30). Pełna partia online dwóch urządzeń rozegrana
przez API w teście e2e; w etapie zostały też „którym graczem jestem” i realtime dla graczy
online, więc etap 9 to już sam front.

## Rzuty w `game-core` — 2026-09-29

- **Źródło kości jest częścią stanu gry.** Gra fizyczna nie śledzi tury; wirtualna ma stan tury:
  numer rzutu, kości na stole i zatrzymane pozycje z ostatniego rzutu (do animacji u innych).
- **`game-core` nie losuje.** Akcja rzutu niesie pięć wartości wylosowanych przez serwer
  i pozycje do zatrzymania; reducer składa z nich kości na stole.
- **Automatyczny pierwszy rzut to osobna akcja.** Serwer wykonuje ją w tej samej transakcji co
  zapis kategorii albo start gry, więc tura bez kości nigdy nie trafia do bazy.
- **Kto zawinił, taki błąd.** Złe dane od gracza (cudza tura, czwarty rzut, złe pozycje
  zatrzymanych, kości przysłane przy zapisie) to błąd zasad gry; złe dane od serwera
  (wartości spoza 1–6, zatrzymane kości przy automatycznym rzucie) to błąd serwera.
- **Testy** wyprowadzone z zasad rzutów (`DECYZJE.md` §4), łącznie z pełną partią na kościach
  wirtualnych; pokrycie `game-core` 100%.

## Baza i API gry online — 2026-09-29 – 2026-09-30

- **Źródło kości i tura w bazie.** Gra ma `diceSource` oraz stan tury w kolumnach (kości, numer
  rzutu, zatrzymane pozycje). Każda akcja składa z nich stan dla reducera i sprawdza je na
  granicy bazy — zły zapis to błąd serwera, nie gracza.
- **Uprawnienia po urządzeniu.** Akcja wie, kto pyta (uczestnik z ciasteczka). W trybie online
  rzuca i zapisuje tylko ten, czyja jest tura; gracz nie podaje, kim jest — przysłany gracz przy
  zapisie kategorii jest odrzucany. Ręczne wpisywanie kości działa tylko w grze lokalnej.
- **Jeden `score` na oba tryby.** Tryb gry decyduje tylko o dostępie (host / gracz), źródle
  kości i o tym, czy po zapisie serwer rzuca za następnego gracza. Zapis kart i koniec gry są
  wspólne.
- **Pierwszy rzut następnego gracza** powstaje w tej samej transakcji co zapis kategorii i trafia
  do logu jako osobny `diceRolled`. Po zapisie kończącym grę nie ma rzutu, a tura jest czyszczona.
- **„Którym graczem jestem”** (`myParticipantId` w `GameView`) liczone przy każdym żądaniu z
  ciasteczka, tak jak `isHost` — nie jest zapisywane.
- **Realtime: pokój na uczestnika** zamiast pokoju hosta. Każdy uczestnik dostaje swój widok,
  wszystkie jego karty ten sam; widzowie spoza gry dzielą jeden pokój.
- **Testy e2e** gry online: dołączanie, start, przerzut, zapis, uprawnienia, pełna partia do
  `COMPLETED` na dwóch urządzeniach, widoki na żywo dla graczy i widzów.

**Dług, który zostaje:**

- Budowanie stanu gry dla reducera z wiersza bazy powtarza się w trzech akcjach (start,
  przerzut, zapis).
- Callback akcji dostaje pytającego jako „może być pusty” niezależnie od rodzaju dostępu, więc
  akcje gracza używają wymuszenia (`asking!`).
- Nieudane dołączenie do gry online zostawia w bazie tożsamość bez uczestnika.
- Wyjście gracza z gry online (pomijanie tur, `ABANDONED` przy jednej osobie) — etap 9.
- Bez limitu na turę nieaktywny gracz blokuje partię (świadomie odłożone).
