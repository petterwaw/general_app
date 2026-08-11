# Plan realizacji

Etapy realizuję **sam i po kolei** (patrz „Tryb pracy" w `CLAUDE.md`). Nie przechodzę do
kolejnego, dopóki poprzedni nie ma spełnionego kryterium „gotowe gdy".

**Claude:** ten plan służy Ci do orientacji, gdzie jestem i czego jeszcze nie powinienem
dotykać — nie jako lista zadań do wykonania. Jeśli pytam o coś z dalszego etapu, zwróć mi na to
uwagę. Rzeczy oznaczonych POZA MVP nie proponuj.

---

## Etap 0 — Specyfikacja zasad *(zadanie właściciela, nie Claude'a)*

Wypełnić `ZASADY-GRY.md`: wariant, wszystkie kategorie, wzory na punkty, bonus, remisy.

**Gotowe gdy:** w `ZASADY-GRY.md` nie ma ani jednego „DO USTALENIA".

---

## Etap 1 — Fundament

Monorepo (pnpm workspaces), ESLint, Prettier, wspólny tsconfig, Docker Compose z PostgreSQL
lokalnie, pusty endpoint w `apps/api` i jeden ekran w `apps/web`, który go woła.

**Gotowe gdy:** jedna komenda odpala front i backend, i one się widzą.

---

## Etap 2 — Silnik gry (`packages/game-core`)

Czysty TypeScript. Zero bazy, zero HTTP, zero zależności zewnętrznych.

- funkcja punktująca: `(kategoria, kości) => punkty`
- reducer `(stan, akcja) => nowyStan`, który **waliduje legalność ruchu**: czy to tura tego
  gracza, czy kategoria jest wolna, czy nie ma czwartego rzutu, czy odłożone kości są z bieżącego
  rzutu
- rozdzielenie szkicu tury od zatwierdzonego zdarzenia (patrz `DECYZJE.md` §4)

To jest najważniejsza paczka w projekcie i jedyna z pokryciem testami bliskim 100%.

**Gotowe gdy:** w teście da się rozegrać całą partię od początku do końca, bez UI i bez bazy.

---

## Etap 3 — API i baza

Schemat, migracje, endpointy: utwórz grę, dodaj uczestnika, wykonaj akcję, pobierz stan.
Obowiązkowo: `revision`, log zdarzeń, klucz idempotencji, `status` gry, `ostatniaAktywnosc`.

**Gotowe gdy:** partię da się rozegrać z Postmana, a restart serwera w połowie niczego nie psuje.

---

## Etap 4 — Frontend gry lokalnej ← **TO JEST MVP**

Nowa gra, dodawanie graczy-gości, tabela wyników, wpisywanie kości fizycznych, koniec gry,
podsumowanie. Adres `/game/[id]`, więc odświeżenie działa z automatu.

**Gotowe gdy:** da się realnie rozegrać partię przy stole z żywymi ludźmi.

> **Tu następuje przerwa.** Właściciel gra kilka partii i zgłasza poprawki, zanim ruszamy dalej.

---

## Etap 5 — Konta i goście

Logowanie, sesja gościa jako anonimowy token, przypięcie uczestnika partii do konta,
statystyki osobiste, ograniczenie „jedno konto = jedna aktywna gra" (indeks unikalny w bazie),
akcja „opuść grę", przekierowanie do aktywnej gry po wejściu na stronę.

---

## Etap 6 — QR i realtime

Gateway WebSocket, pokój na partię, krótki kod dołączania + QR na ekranie hosta, role
`HOST` / `GRACZ` / `OBSERWATOR` z egzekwowaniem uprawnień po stronie serwera, wyrzucanie gracza
przez hosta, obsługa ponownego połączenia po `revision`, zadanie cykliczne kasujące wygasłe gry.

**Gotowe gdy:** po wyłączeniu wifi na 30 sekund i włączeniu z powrotem wszystko zgadza się samo,
bez odświeżania strony.

---

## Etap 7 — Kości wirtualne

Losowanie wyłącznie po stronie serwera. Animacja na froncie to odtworzenie wyniku, który już
przyszedł z API. Oznaczenie w bazie, czy partia była na kościach fizycznych czy wirtualnych.

---

## Etap 8 — Statystyki globalne

Tabele agregatów przeliczane zadaniem w tle. Do rankingu wchodzą wyłącznie uczestnicy z `userId`,
z gier o statusie `ZAKONCZONA`, rozegranych na kościach wirtualnych.

---

## Etap 9 — Tryb online *(POZA MVP)*

Matchmaking (min. 2, maks. 5 graczy), lobby, start po odczekaniu, limit 90 s na turę egzekwowany
zadaniem cyklicznym, wyrzucanie po dwóch przekroczeniach, kończenie gry przy jednym pozostałym
graczu ze statusem `PORZUCONA`. Redis (pub/sub) dopiero przy więcej niż jednej instancji API.

---

## Etap 10 — Utwardzanie

Rate limity, Sentry, kasowanie porzuconych gier, PWA.

---

## Świadomie POZA MVP — nie implementować

- Tryb online i matchmaking (etap 9)
- Przekazanie roli hosta innemu urządzeniu
- Zaliczanie wygranej przy porzuconej grze po progu 10/15 kategorii
- Statystyki gościa zapisywane po tokenie urządzenia
- Boty / gra z komputerem *(nigdy nie było omawiane — nie zakładaj, że mają być)*
