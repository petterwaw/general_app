# Do ustalenia

Lista rzeczy, które **świadomie nie zostały jeszcze rozstrzygnięte**.

**Claude: nie przyjmuj tu żadnych wartości domyślnych.** Kiedy zadanie dotyka pozycji z tej
listy — zatrzymaj się i zapytaj właściciela projektu. Po otrzymaniu odpowiedzi przenieś ustalenie
do `DECYZJE.md` lub `ZASADY-GRY.md` i usuń pozycję stąd.

---

## Blokujące etap 5 (konta)

- [ ] **Czym się logujemy?** E-mail + hasło, logowanie przez Google/Discord, magic link?
- [ ] **Jaka biblioteka do auth?** Auth.js, Better Auth, własne w NestJS?

## Blokujące etap 8 (statystyki)

- [ ] **Co dokładnie pokazuje ranking globalny?** Najwyższy pojedynczy wynik, średnia, liczba
      wygranych, coś jeszcze?
- [ ] **Czy do statystyk wchodzi gra online dograna przez osobę, która została sama?** Od
      2026-10-01 taka gra kończy się normalnie, z wynikami i zwycięzcą (`DECYZJE.md` §8).

## Odłożone razem z limitem na turę i matchmakingiem

- [ ] **Co robi serwer po przekroczeniu 90 sekund?** Ustalono tylko, że drugie przekroczenie
      wyrzuca gracza. Nie ustalono, co dzieje się przy pierwszym — auto-pas z zerem w wybranej
      kategorii, przekazanie tury bez zapisu, coś innego?
- [ ] **Ile czeka lobby przed startem gry online?** (dotyczy matchmakingu)

## Niezablokowane, ale otwarte

- [ ] **Tryb ciemny** — interfejs ma dziś jeden, jasny motyw (`DESIGN.md`). Czy potrzebny
      jest ciemny?
- [ ] **Czy jest historia rozegranych partii dostępna dla użytkownika?** Log zdarzeń to
      umożliwia, ale nie ustalono, czy ma być wystawiony w UI.
- [ ] **Kasowanie porzuconych gier** — po jakim czasie gra `ABANDONED` znika z bazy? Czy
      kasujemy też gry zakończone (`COMPLETED`)? Przy kontach będą potrzebne do statystyk.
- [ ] **Wyszukiwarki** — czy rejestrujemy domenę w Google Search Console i czy strony
      konkretnych gier mają być wyłączone z indeksowania (`noindex`)?

---

## Świadomie odrzucone — nie proponuj tego ponownie

- Przenoszenie statystyk gościa na konto po rejestracji — **nie ma czego przenosić**, gość
  z założenia nie ma statystyk globalnych.
- Statystyki gościa po tokenie urządzenia — odrzucone dla MVP.
- Cofanie zatwierdzonej tury — odrzucone całkowicie, nie tylko dla MVP.
- PWA (instalacja na telefonie, tryb offline) — odrzucone (2026-10-07).
