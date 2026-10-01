# Etap 9 — Online przez zaproszenie

Zakres zawężony 2026-09-28 — online dla gości, bez kont:

- gość zakłada grę online i dostaje link / kod zaproszenia,
- dołączanie z imieniem, 1–5 graczy (zmienione 2026-10-01 z 2–5), lobby i start,
- tożsamość gracza = sekret w ciasteczku urządzenia (jak dziś host),
- wyjście gracza: jego tury są pomijane; kto zostanie sam, dogrywa do końca, a gra, z której
  wyszli wszyscy, kończy się jako `ABANDONED` (`DECYZJE.md` §8, zmienione 2026-10-01).

**Backend przeniesiony do etapu 7** (2026-09-29): zakładanie gry online, dołączanie, start
i uprawnienia po urządzeniu gracza powstają razem z kośćmi wirtualnymi. Tu zostaje front:
lobby online, link / kod zaproszenia, ekran gry z rzutami, oraz wyjście gracza z pomijaniem
jego tur.

Poza zakresem na teraz: matchmaking, limit 90 s na turę i wyrzucanie za przekroczenia.
Redis (pub/sub) dopiero przy więcej niż jednej instancji API.

**Gotowe gdy:** 2–5 osób na osobnych urządzeniach rozgrywa partię do końca z linku
zaproszenia, bez odświeżania strony.

Znany dług od startu: bez limitu na turę nieaktywny gracz blokuje partię, dopóki pozostali
nie wyjdą.

**Kod zaproszenia — po froncie gry online** (ustalone 2026-10-01): krótki kod do wpisania
zamiast otwierania linku; link ma wtedy postać `/join/<kod>`, a „Join game” na `/games` to pole
na kod. Do tego czasu zaprasza link do gry, a „Join game” zostaje jako „coming soon”.
Szczegóły kodu — `DO-USTALENIA.md`.
