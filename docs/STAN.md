# Stan projektu

Etapy realizuję **po kolei** (patrz „Tryb pracy" w `CLAUDE.md`). Nie przechodzę do
kolejnego, dopóki poprzedni nie ma spełnionego kryterium „gotowe gdy" opisanego w jego pliku
w `docs/etapy/`.

**Claude:** ten plik służy Ci do orientacji, gdzie jestem i czego jeszcze nie powinienem
dotykać — nie jako lista zadań do wykonania. Szczegóły każdego etapu (cel, kryterium „gotowe
gdy", notatki postępu, dług) są w `docs/etapy/etap-N.md` — czytaj tylko plik odpowiadający
etapowi, którego dotyczy bieżące pytanie (zwykle bieżący, czasem bieżący + poprzedni, jeśli
potrzebujesz kontekstu domknięcia). Jeśli pytam o coś z etapu dalszego niż bieżący, zwróć mi na
to uwagę. Rzeczy z listy „Świadomie POZA MVP" niżej nie proponuj.

## Status etapów

| Etap | Temat | Status |
|---|---|---|
| [0](etapy/etap-0.md) | Specyfikacja zasad | ZROBIONE (`ZASADY-GRY.md`: WYPEŁNIONE) |
| [1](etapy/etap-1.md) | Fundament | KRYTERIUM SPEŁNIONE — `pnpm dev` w korzeniu odpala `web` i `api` naraz (`concurrently`), front woła API; nadal brak notatki postępu w `etap-1.md` |
| [2](etapy/etap-2.md) | Silnik gry (`game-core`) | KRYTERIUM SPEŁNIONE |
| [3](etapy/etap-3.md) | API i baza | KRYTERIUM SPEŁNIONE (2026-09-25: wynik końcowy w bazie, `GET /games/:id/events`, `join` tylko dla hosta, jedna gra na urządzenie hosta, wyjście hosta i wyrzucanie w lobby — PR #6; `maxAge` ciasteczka hosta: 90 dni z przedłużaniem, 2026-09-28; test restartu serwera przeniesiony do etapu 4) |
| [4](etapy/etap-4.md) | Frontend gry lokalnej (MVP) | KRYTERIUM SPEŁNIONE (2026-09-27: pełna partia rozegrana przy stole, restart serwera w trakcie partii sprawdzony ręcznie, 2026-09-28 także testem e2e) — ekran gry złożony z komponentów, zatwierdzenie kości i zapis kategorii wołają API; wyjście z gry, `/games` w nowym designie i karta niedokończonej gry hosta (PR #8); zakończona gra zostaje na ekranie gry z zablokowanymi kośćmi; log gry pod graczami, ekran gry dopasowany do telefonów; ekran końca gry z wynikami i animacje stołu (`ux/game-end-and-dice-motion`); ekrany błędów (PR #11) i widok tylko do oglądania dla nie-hosta (`feat/view-only-guests`); nowa reguła sekcji dolnej (zero zawsze wolno), testy restartu i równoczesnych żądań, typecheck i build w CI (`test/coverage-gaps`); poprawianie kości po „Confirm” świadomie odłożone |
| [5](etapy/etap-5.md) | Konta i goście | odłożone (2026-09-28) |
| [6](etapy/etap-6.md) | Realtime | KRYTERIUM SPEŁNIONE (2026-09-28: stan gry na żywo przez Socket.IO, powrót po zerwanym połączeniu po `revision`, test wifi ręcznie i e2e — PR #17) |
| [7](etapy/etap-7.md) | Kości wirtualne | KRYTERIUM SPEŁNIONE (2026-09-30: pełna partia online dwóch urządzeń przez API w teście e2e) — obejmuje backend gry online z etapu 9, „którym graczem jestem” i realtime dla graczy; zostaje `/etap-review` i PR |
| [8](etapy/etap-8.md) | Statystyki globalne | odłożone (2026-09-28) |
| [9](etapy/etap-9.md) | Online przez zaproszenie | nierozpoczęte — backend przeniesiony do etapu 7 (2026-09-29), tu zostaje front |
| [10](etapy/etap-10.md) | Utwardzanie i produkcja | nierozpoczęte |

## Kierunek od 2026-09-28

Przed kontami powstaje gra online dla gości. Kolejność: **6 (realtime) → 7 (kości wirtualne)
→ 9 (online przez zaproszenie) → 10 (produkcja)**. Etapy 5 (konta) i 8 (statystyki) są
odłożone — bez kont nie ma statystyk.

## Świadomie POZA MVP — nie implementować

- Matchmaking — online tylko przez zaproszenie
- Limit 90 s na turę i wyrzucanie za przekroczenia — dojdą później
- Przekazanie roli hosta innemu urządzeniu
- Zaliczanie wygranej przy porzuconej grze po progu 10/15 kategorii
- Statystyki gościa zapisywane po tokenie urządzenia
- Boty / gra z komputerem *(nigdy nie było omawiane — nie zakładaj, że mają być)*
