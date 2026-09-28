# Etap 9 — Online przez zaproszenie

Zakres zawężony 2026-09-28 — online dla gości, bez kont:

- gość zakłada grę online i dostaje link / kod zaproszenia,
- dołączanie z imieniem, 2–5 graczy, lobby i start,
- tożsamość gracza = sekret w ciasteczku urządzenia (jak dziś host),
- wyjście gracza: jego tury są pomijane; gdy zostanie jedna osoba, gra kończy się jako
  `ABANDONED` bez zwycięzcy (`DECYZJE.md` §8).

Poza zakresem na teraz: matchmaking, limit 90 s na turę i wyrzucanie za przekroczenia.
Redis (pub/sub) dopiero przy więcej niż jednej instancji API.

**Gotowe gdy:** 2–5 osób na osobnych urządzeniach rozgrywa partię do końca z linku
zaproszenia, bez odświeżania strony.

Znany dług od startu: bez limitu na turę nieaktywny gracz blokuje partię, dopóki pozostali
nie wyjdą.
