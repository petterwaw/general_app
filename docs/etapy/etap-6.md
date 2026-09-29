# Etap 6 — Realtime

Gateway WebSocket, pokój na partię, rozsyłanie stanu po każdej zatwierdzonej akcji, obsługa
ponownego połączenia po `revision`.

Zmienione 2026-09-28: QR i krótki kod dla trybu lokalnego odłożone (podgląd działa przez link do
gry); zadanie kasujące wygasłe gry usunięte — gra lokalna nie wygasa (`DECYZJE.md` §5).

**Gotowe gdy:** po wyłączeniu wifi na 30 sekund i włączeniu z powrotem wszystko zgadza się samo,
bez odświeżania strony.

**Postęp: KRYTERIUM SPEŁNIONE (2026-09-28).** Test z wyłączonym na 30 s wifi przeszedł ręcznie
na telefonie, a powrót po zerwanym połączeniu pilnuje test e2e (wpis niżej).

## Stan gry na żywo przez Socket.IO — 2026-09-28

PR #17 (`feat/realtime`, scalony do `main`).

- **Akcje zostają na HTTP, socket tylko rozsyła stan.** Idempotencja, sprawdzanie ciasteczka
  hosta i walidacja działają bez zmian.
- **Subskrypcja:** klient przy każdym połączeniu (także po reconnect) wysyła
  `subscribe { gameId, revision }`. Serwer odsyła aktualny stan tylko klientowi, który jest
  w tyle. Po ponownym połączeniu dosyłany jest cały stan, nie brakujące zdarzenia — `DECYZJE.md`
  §10 dopuszcza oba warianty. Schemat `subscribeSchema` jest w `packages/contracts`.
- **Dwa pokoje na grę:** rolę socketu ustala raz ciasteczko `host_secret` z handshake’u. Host
  i widzowie dostają każdy swój `GameView` (z właściwym `isHost`), więc host po reconnect
  zachowuje swoje przyciski.
- **Stan wychodzi dopiero po commicie transakcji.** Nikt nie zobaczy stanu wycofanego, a akcja
  powtórzona z tym samym kluczem idempotencji niczego nie rozsyła. Serwis i gateway łączy
  `GameUpdates`, żeby nie było między nimi cyklu zależności.
- **Błędy** z walidacji i serwisu trafiają na socket w tym samym kształcie `ApiErrorResponse`,
  co w REST.
- **CORS:** Socket.IO ma tę samą listę dozwolonych źródeł co HTTP, z ciasteczkami.
- **Front:** `useGameSocket` obok `useGame`. Stan z socketu trafia na ekran tylko wtedy, gdy ma
  nowszą `revision` niż ten na ekranie.
- **Testy:** `game-realtime.e2e-spec.ts` — host i widz dostają każdy swój widok, widz po
  ponownym połączeniu nadrabia pominięte akcje, powtórzona akcja nie jest rozsyłana,
  błędny `subscribe` dostaje kształt błędu API. Ręcznie: aktualizacje na żywo w dwóch
  przeglądarkach i test wifi.

Dług:

- Jedna instancja API. Przy kilku instancjach rozsyłanie wymaga pub/sub (Redis,
  `DECYZJE.md` §11) — dopiero przy trybie online.
