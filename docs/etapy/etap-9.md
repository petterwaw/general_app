# Etap 9 — Online przez zaproszenie

**Postęp: KRYTERIUM SPEŁNIONE** (2026-10-02: pełna partia online na osobnych urządzeniach
z linku zaproszenia, bez odświeżania). Zostaje kod zaproszenia — zablokowany przez
`DO-USTALENIA.md`.

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

## Front gry online — 2026-10-01 – 2026-10-02

- **Zakładanie gry online z `/games`** — wybór trybu w formularzu tworzenia gry; zakładający
  trafia do lobby jako gracz z rolą `HOST`.
- **Lobby online z linkiem zaproszenia.** Link prowadzi na ekran gry; urządzenie spoza gry widzi
  w lobby formularz dołączenia z imieniem. Start i usuwanie graczy — tylko host, tylko w lobby.
- **Ekran gry online.** Gracz w swojej turze zatrzymuje kości, przerzuca (najwyżej 3 rzuty)
  i zapisuje kategorię; wybór zatrzymanych kości jest szkicem na urządzeniu. Kości po rzucie
  wjeżdżają na stół jedna po drugiej.
- **Gra w toku dla każdego urządzenia** — `GET /games/active` zwraca aktywną grę urządzenia
  niezależnie od roli, więc `/games` proponuje powrót także zwykłym graczom.
- **Wyjście gracza.** Kolumna i wiersz gracza, który wyszedł w trakcie gry, są przyciemnione
  z oznaczeniem „Left”. Gracz usunięty z lobby albo wychodzący z niego staje się widzem także
  na ekranach, które ma otwarte — akcja przekazuje, kto wypadł z gry, a realtime przenosi jego
  połączenia do widzów.
- **Log gry** pokazuje rzuty online (z zatrzymanymi kośćmi) i wyjście gracza; nowy typ
  zdarzenia w kontrakcie bez obsługi w logu nie przejdzie typechecku.
- **Testy e2e** realtime: usunięty i wychodzący z lobby dostają widok widza, inne gry nie
  dostają cudzych aktualizacji.
- **Testy frontu** — `apps/web` ma Vitest (także w CI); logika tury online (zatrzymywanie kości,
  dostępność przerzutu, kolejność wjazdu kości) testowana z zasad.

**Dług, który zostaje:**

- Kopiowanie linku zaproszenia wymaga bezpiecznego kontekstu (HTTPS / `localhost`); przy
  testach z telefonu po adresie w sieci lokalnej link trzeba skopiować z paska adresu.
  Świadomie bez obejścia — produkcja będzie na HTTPS.
- Limit rzutów na turę jest powtórzony po stronie frontu jako podpowiedź UI; rozstrzyga serwer.
