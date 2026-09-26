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
| [3](etapy/etap-3.md) | API i baza | KRYTERIUM SPEŁNIONE (2026-09-25: wynik końcowy w bazie, `GET /games/:id/events`, `join` tylko dla hosta, jedna gra na urządzenie hosta, wyjście hosta i wyrzucanie w lobby — PR #6; otwarte: `maxAge` ciasteczka hosta; test restartu serwera przeniesiony do etapu 4) |
| [4](etapy/etap-4.md) | Frontend gry lokalnej (MVP) | **W TRAKCIE** — ekran gry złożony z komponentów, zatwierdzenie kości i zapis kategorii wołają API; wyjście z gry, `/games` w nowym designie i karta niedokończonej gry hosta (PR #8); zakończona gra zostaje na ekranie gry z zablokowanymi kośćmi; brakuje logu gry, ekranu końca z wynikami i lobby w nowym designie; otwarte: poprawianie kości po „Confirm” (serwer odrzuca drugi `roll`) |
| [5](etapy/etap-5.md) | Konta i goście | nierozpoczęte |
| [6](etapy/etap-6.md) | QR i realtime | nierozpoczęte |
| [7](etapy/etap-7.md) | Kości wirtualne | nierozpoczęte |
| [8](etapy/etap-8.md) | Statystyki globalne | nierozpoczęte |
| [9](etapy/etap-9.md) | Tryb online *(POZA MVP)* | nierozpoczęte |
| [10](etapy/etap-10.md) | Utwardzanie | nierozpoczęte |

## Świadomie POZA MVP — nie implementować

- Tryb online i matchmaking (etap 9)
- Przekazanie roli hosta innemu urządzeniu
- Zaliczanie wygranej przy porzuconej grze po progu 10/15 kategorii
- Statystyki gościa zapisywane po tokenie urządzenia
- Boty / gra z komputerem *(nigdy nie było omawiane — nie zakładaj, że mają być)*
