# Etap 9 — Tryb online *(POZA MVP)*

Matchmaking (min. 2, maks. 5 graczy), lobby, start po odczekaniu, limit 90 s na turę egzekwowany
zadaniem cyklicznym, wyrzucanie po dwóch przekroczeniach, kończenie gry przy jednym pozostałym
graczu ze statusem `PORZUCONA`. Redis (pub/sub) dopiero przy więcej niż jednej instancji API.
