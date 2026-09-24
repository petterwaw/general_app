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

- [ ] **Czy `POST /games/:id/join` ma w ogóle zostać?** W `DECYZJE.md` §3 graczy wpisuje
      wyłącznie host, a dołączeni przez QR są tylko do podglądu. Dziś endpoint pozwala
      każdemu, kto zna `id` gry, dopisać się jako pełnoprawny gracz.
- [ ] **Jak długo ma żyć ciasteczko hosta?** `DECYZJE.md` §5 mówi, że host wraca do gry po
      zamknięciu przeglądarki — to wymaga konkretnego `maxAge`, a dziś ciasteczko jest sesyjne.
- [ ] **Czy host może prowadzić kilka gier z jednego urządzenia?** Jeśli tak, ciasteczko musi
      być per gra (dziś jedna nazwa `host_secret` nadpisuje poprzedni sekret).
- [ ] **Zod i `packages/contracts` czy `class-validator`?** `DECYZJE.md` §11 mówi o wspólnych
      schematach Zod; kod poszedł w `class-validator`, a paczka `contracts` jest pusta.
      Jedno z dwojga trzeba poprawić — albo kod, albo decyzję.
- [ ] **Gdzie liczy się suma punktów i bonus?** Dziś tylko na froncie. Serwer nie zna wyniku
      końcowego partii, więc etap 8 nie ma z czego zbudować statystyk.

## Blokujące etap 5 (konta)

- [ ] **Czym się logujemy?** E-mail + hasło, logowanie przez Google/Discord, magic link?
- [ ] **Jaka biblioteka do auth?** Auth.js, Better Auth, własne w NestJS?

## Blokujące etap 6 (QR i wygasanie)

- [ ] **Po jakim czasie bezczynności gra lokalna wygasa?** (godziny? dni?)
- [ ] **Po jakim czasie bezczynności host jest uznany za nieobecnego?** Właściciel wspominał
      o „wyrzuceniu za bezczynność", ale bez konkretnej wartości.
- [ ] **Maksymalna liczba graczy w grze lokalnej?** Dla online ustalono 2–5, dla lokalnej nie.

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

- [ ] **Krok potwierdzenia przed zapisem kategorii** — decyzja frontendowa, do podjęcia przy
      budowie UI etapu 4. Silnika nie dotyczy.
- [ ] **Język interfejsu** — polski, angielski, oba?
- [ ] **Wygląd, kolorystyka, identyfikacja wizualna** — nie było omawiane.
- [ ] **Czy jest historia rozegranych partii dostępna dla użytkownika?** Log zdarzeń to
      umożliwia, ale nie ustalono, czy ma być wystawiony w UI.

---

## Świadomie odrzucone — nie proponuj tego ponownie

- Przenoszenie statystyk gościa na konto po rejestracji — **nie ma czego przenosić**, gość
  z założenia nie ma statystyk globalnych.
- Statystyki gościa po tokenie urządzenia — odrzucone dla MVP.
- Zaliczanie wygranej ostatniej osobie w porzuconej grze online — odrzucone dla MVP.
- Cofanie zatwierdzonej tury — odrzucone całkowicie, nie tylko dla MVP.
