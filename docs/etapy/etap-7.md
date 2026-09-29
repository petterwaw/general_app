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

**Postęp: W TOKU.** Logika rzutów w `game-core` gotowa i przetestowana; zostaje baza, API
i partia rozegrana przez API.

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
