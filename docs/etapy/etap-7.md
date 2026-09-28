# Etap 7 — Kości wirtualne

Losowanie wyłącznie po stronie serwera. Animacja na froncie to odtworzenie wyniku, który już
przyszedł z API. Oznaczenie w bazie, czy partia była na kościach fizycznych czy wirtualnych.

Tylko dla trybu online (ustalone 2026-09-28) — tryb lokalny zostaje na kościach fizycznych.
Serwer pilnuje maks. 3 rzutów i kości odkładanych między rzutami; reducer ma dla kości
wirtualnych osobny zestaw walidacji (`DECYZJE.md` §4).

**Gotowe gdy:** partię na kościach wirtualnych da się rozegrać do końca przez API, a zasady
rzutów mają testy w `game-core` wyprowadzone z `ZASADY-GRY.md`.
