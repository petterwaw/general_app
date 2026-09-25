# Do ustalenia

Lista rzeczy, które **świadomie nie zostały jeszcze rozstrzygnięte**.

**Claude: nie przyjmuj tu żadnych wartości domyślnych.** Kiedy zadanie dotyka pozycji z tej
listy — zatrzymaj się i zapytaj właściciela projektu. Po otrzymaniu odpowiedzi przenieś ustalenie
do `DECYZJE.md` lub `ZASADY-GRY.md` i usuń pozycję stąd.

---

## Blokujące etap 1 (fundament)

- [ ] **Gdzie hostujemy?** Frontend i backend mogą stać osobno; backend musi być długo żyjącym
      procesem (nie serverless).
- [ ] **Nazwa aplikacji.** Nie może być „Yahtzee". Do czasu wyboru w kodzie: `dice-app`.

## Blokujące domknięcie etapu 3 (wyszło z przeglądu 2026-09-24)

- [ ] **Jak długo ma żyć ciasteczko hosta?** `DECYZJE.md` §5 mówi, że host wraca do gry po
      zamknięciu przeglądarki — to wymaga konkretnego `maxAge`, a dziś ciasteczko jest sesyjne.
      Naturalnie wiąże się z czasem wygasania gry (etap 6, też nieustalony).

## Blokujące etap 5 (konta)

- [ ] **Czym się logujemy?** E-mail + hasło, logowanie przez Google/Discord, magic link?
- [ ] **Jaka biblioteka do auth?** Auth.js, Better Auth, własne w NestJS?

## Blokujące etap 6 (QR i wygasanie)

- [ ] **Po jakim czasie bezczynności gra lokalna wygasa?** (godziny? dni?)
- [ ] **Po jakim czasie bezczynności host jest uznany za nieobecnego?** Właściciel wspominał
      o „wyrzuceniu za bezczynność", ale bez konkretnej wartości.

## Blokujące etap 8 (statystyki)

- [ ] **Czy gra lokalna rozegrana na kościach wirtualnych wchodzi do rankingu globalnego?**
      Z reguły „ranking tylko z kości wirtualnych" wynika, że tak — ale host nadal steruje całą
      partią, więc warto to potwierdzić wprost.
- [ ] **Co dokładnie pokazuje ranking globalny?** Najwyższy pojedynczy wynik, średnia, liczba
      wygranych, coś jeszcze?

## Blokujące etap 9 (online, POZA MVP)

- [ ] **Co robi serwer po przekroczeniu 90 sekund?** Ustalono tylko, że drugie przekroczenie
      wyrzuca gracza. Nie ustalono, co dzieje się przy pierwszym — auto-pas z zerem w wybranej
      kategorii, przekazanie tury bez zapisu, coś innego?
- [ ] **Ile czeka lobby przed startem gry online?**
- [ ] **Czy gość może grać online?** Właściciel mówił, że tak, ale bez szczegółów, jak wtedy
      działa „jedno konto = jedna gra" (gość nie ma konta).

## Niezablokowane, ale otwarte

- [ ] **Tryb ciemny** — interfejs ma dziś jeden, jasny motyw (`DESIGN.md`). Czy potrzebny
      jest ciemny?
- [ ] **Do czego ma służyć `GET /games`?** Endpoint zostaje, ale dziś zwraca wszystkie gry
      z pełnymi kartami wyników, bez filtra i stronicowania. Rozważana publiczna lista gier
      w statusie LOBBY do dołączenia — nie ma jej w planie i zahacza o tryb online (POZA MVP).
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
