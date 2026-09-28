# Do ustalenia

Lista rzeczy, które **świadomie nie zostały jeszcze rozstrzygnięte**.

**Claude: nie przyjmuj tu żadnych wartości domyślnych.** Kiedy zadanie dotyka pozycji z tej
listy — zatrzymaj się i zapytaj właściciela projektu. Po otrzymaniu odpowiedzi przenieś ustalenie
do `DECYZJE.md` lub `ZASADY-GRY.md` i usuń pozycję stąd.

---

## Blokujące etap 1 (fundament)

- [ ] **Gdzie hostujemy?** Frontend i backend mogą stać osobno; backend musi być długo żyjącym
      procesem (nie serverless). Prawdopodobnie AWS (2026-09-28) — decyzja przy wdrożeniu (etap 10).
- [ ] **Nazwa aplikacji.** Nie może być „Yahtzee". Do czasu wyboru w kodzie: `dice-app`.

## Blokujące etap 5 (konta)

- [ ] **Czym się logujemy?** E-mail + hasło, logowanie przez Google/Discord, magic link?
- [ ] **Jaka biblioteka do auth?** Auth.js, Better Auth, własne w NestJS?

## Blokujące etap 8 (statystyki)

- [ ] **Co dokładnie pokazuje ranking globalny?** Najwyższy pojedynczy wynik, średnia, liczba
      wygranych, coś jeszcze?

## Blokujące etap 9 (online przez zaproszenie)

- [ ] **Kto może wystartować grę online?** Tylko zakładający czy każdy w lobby? (`DECYZJE.md` §2:
      online nie ma hosta.)
- [ ] **Ile gier naraz na jedno urządzenie?** Czy urządzenie może być jednocześnie w grze
      lokalnej i online, czy obowiązuje jedna aktywna gra na urządzenie?

## Odłożone razem z limitem na turę i matchmakingiem

- [ ] **Co robi serwer po przekroczeniu 90 sekund?** Ustalono tylko, że drugie przekroczenie
      wyrzuca gracza. Nie ustalono, co dzieje się przy pierwszym — auto-pas z zerem w wybranej
      kategorii, przekazanie tury bez zapisu, coś innego?
- [ ] **Ile czeka lobby przed startem gry online?** (dotyczy matchmakingu)

## Niezablokowane, ale otwarte

- [ ] **Tryb ciemny** — interfejs ma dziś jeden, jasny motyw (`DESIGN.md`). Czy potrzebny
      jest ciemny?
- [ ] **Do czego ma służyć `GET /games`?** Endpoint zostaje, ale dziś zwraca wszystkie gry
      z pełnymi kartami wyników, bez filtra i stronicowania. Rozważana publiczna lista gier
      w statusie LOBBY do dołączenia — nie ma jej w planie i zahacza o matchmaking (poza zakresem).
      Historia gier gracza to osobne zapytanie po `userId` (etap 5+), nie ten endpoint.
- [ ] **Czy jest historia rozegranych partii dostępna dla użytkownika?** Log zdarzeń to
      umożliwia, ale nie ustalono, czy ma być wystawiony w UI.

---

## Świadomie odrzucone — nie proponuj tego ponownie

- Przenoszenie statystyk gościa na konto po rejestracji — **nie ma czego przenosić**, gość
  z założenia nie ma statystyk globalnych.
- Statystyki gościa po tokenie urządzenia — odrzucone dla MVP.
- Zaliczanie wygranej ostatniej osobie w porzuconej grze online — odrzucone dla MVP.
- Cofanie zatwierdzonej tury — odrzucone całkowicie, nie tylko dla MVP.
