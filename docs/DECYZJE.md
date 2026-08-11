# Decyzje projektowe

Wszystko w tym pliku zostało **wprost ustalone** z właścicielem projektu i jest wiążące.
Rzeczy nierozstrzygnięte są w `DO-USTALENIA.md` — nie uzupełniaj ich samodzielnie.

---

## 1. Tryby gry

Rozróżniamy dwie niezależne osie. Nie myl ich ze sobą.

**Oś A — kto steruje grą:**

| Tryb | Opis | Status |
|---|---|---|
| Lokalny | Jedno urządzenie (host) prowadzi grę dla wszystkich uczestników przy stole | MVP |
| Online | Każdy gracz na swoim urządzeniu, dobierani przez matchmaking | POZA MVP |

**Oś B — skąd biorą się kości:**

| Źródło | Opis | Dostępne w |
|---|---|---|
| Fizyczne | Prawdziwe kości na stole, host wpisuje wyniki ręcznie | tylko tryb lokalny |
| Wirtualne | Losuje serwer | tryb lokalny i online |

W trybie online kości fizyczne **nie istnieją**.

---

## 2. Role uczestników

| Rola | Uprawnienia |
|---|---|
| `HOST` | Jedyny, kto wykonuje akcje w trybie lokalnym. Wpisuje wyniki wszystkich graczy. Może wyrzucić gracza z gry. |
| `GRACZ` | Dołączył przez QR, zalogował się kontem. **Tylko podgląd** — nie może nic edytować. Jego statystyki się zapisują. |
| `OBSERWATOR` | Dołączył przez QR, nie ma konta lub nie chce grać. Tylko podgląd. |

**Uproszczenie implementacyjne:** `GRACZ` i `OBSERWATOR` to technicznie ten sam mechanizm —
klient tylko do odczytu. Jedyna różnica polega na tym, czy do slotu uczestnika w partii przypięte
jest konto użytkownika. Nie buduj dwóch osobnych ścieżek.

Rola jest polem na rekordzie uczestnika, nie wynika z kolejności na liście. Host identyfikuje się
tokenem zapisanym na urządzeniu (sekret w cookie), sprawdzanym przy każdej akcji. Samo ID gry nie
może wystarczać do bycia hostem.

**W trybie online nie ma hosta** — wszyscy mają ten sam poziom dostępu i nikt nie może nikogo
wyrzucić.

---

## 3. Dołączanie przez QR (tryb lokalny)

- Host wyświetla na swoim ekranie kod QR oraz krótki kod tekstowy (do przepisania ręcznie).
- Po zeskanowaniu osoba wybiera: dołączyć jako gracz (wymaga zalogowania) albo jako obserwator.
- Po zalogowaniu uczestnik wyświetla się na liście jako gracz zalogowany, a jego wynik z tej
  partii wchodzi do jego statystyk.
- **Nikt dołączony przez QR nie może edytować niczego.** Wpisywanie wyników pozostaje wyłącznie
  po stronie urządzenia hosta.

---

## 4. Przebieg tury i cofanie

Model, na którym opiera się cała mechanika cofania:

**Tura w trakcie = szkic (edytowalny). Tura zatwierdzona = zdarzenie (nieodwracalne).**

Dopóki gracz nie zapisze kategorii, wszystko w jego turze jest szkicem: wykonane rzuty, odłożone
kości, wpisane wartości kości fizycznych. Poprawki w obrębie szkicu są dozwolone i darmowe —
zakładamy, że host mógł się pomylić przy przepisywaniu.

W momencie zapisania kategorii szkic zamienia się we wpis w logu zdarzeń i **nie da się go
cofnąć**. Nie implementuj zdarzeń kompensacyjnych ani cofania całych tur.

**W trybie online nie ma czego cofać** — gracz nigdy nie wpisuje wartości kości, dostaje je
z serwera. Edytowalne jest wyłącznie to, które kości odkłada przed kolejnym rzutem.

Krok potwierdzenia przed zapisem kategorii to decyzja frontendowa, podejmowana przy budowie UI.
Silnik gry dostaje gotową akcję „zapisz kategorię X" i nie musi o tym nic wiedzieć.

---

## 5. Host wychodzi z gry (tryb lokalny)

- Host może wrócić do gry po zamknięciu przeglądarki — dopóki gra nie wygasła.
- Gra bez aktywności wygasa po określonym czasie i znika. Uzasadnienie: to gra przy stole między
  znajomymi; jeśli host skończył, to zwykle wszyscy skończyli. Nie ma sensu ciągnąć takiej partii.
- **Przekazanie hosta innemu urządzeniu przed wyjściem — POZA MVP.** Ale rola ma być polem na
  uczestniku już teraz, żeby dodanie tego później było zmianą jednej wartości, a nie przepisaniem
  logiki uprawnień.

---

## 6. Jedno konto = jedna aktywna gra

- Zalogowany użytkownik nie może być jednocześnie w dwóch grach. Żeby dołączyć do nowej, musi
  opuścić poprzednią.
- Po wejściu na stronę użytkownik z aktywną grą jest przenoszony do jej pokoju.
- Musi istnieć jawna akcja „opuść grę", zwalniająca slot.
- **To ma być ograniczenie na poziomie bazy** (częściowy indeks unikalny na `userId` dla
  aktywnych uczestnictw), nie tylko sprawdzenie w serwisie. Sam warunek w kodzie przepuści dwa
  równoczesne żądania.
- Jeden użytkownik z dwiema otwartymi kartami przeglądarki to **jeden uczestnik z dwoma
  połączeniami**, nie dwie gry. Modeluj sesje WebSocket jako listę per uczestnik.

---

## 7. Limit czasu na turę (tryb online)

- **90 sekund na całą turę**, nie na pojedynczy rzut. Ktoś zastanawiający się nad odłożeniem
  kości nie może wypaść w środku ruchu.
- Licznik zeruje się po każdym wykonanym ruchu. Gracz, który raz zgubił sieć, nie ma
  „przewinienia na koncie" do końca partii.
- **Dwa przekroczenia czasu z rzędu = wyrzucenie z gry.**
- Deadline przechowujemy jako znacznik czasu w bazie. Egzekwuje go zadanie cykliczne, nie
  `setTimeout`. Klient rysuje odliczanie na podstawie znacznika z serwera, ale sam o niczym
  nie decyduje.

---

## 8. Kiedy gra się kończy i co się liczy do statystyk

**Tryb lokalny:** do statystyk wchodzą **wyłącznie partie dograne do końca**. Gra wygasła albo
porzucona nie liczy się w ogóle.

**Tryb online:** gra kończy się, gdy zostanie w niej jedna osoba. Taka gra ma status
`PORZUCONA` i **nie wchodzi do statystyk**. Ostatnia osoba **nie dostaje wygranej** — nie ma
zwycięzcy.

Wyjątek POZA MVP: jeżeli w momencie porzucenia rozegrano już co najmniej **10 z 15 kategorii**,
grę można zaliczyć osobie, która została. Nie implementuj tego bez wyraźnej decyzji.

---

## 9. Statystyki

- **Gość istnieje w obrębie partii, nie istnieje globalnie.** W podsumowaniu i historii danej gry
  gość ma imię, punkty i wypełnione kategorie. Nie ma profilu, rekordów ani miejsca w rankingu.
- Do statystyk globalnych wchodzą **wyłącznie uczestnicy z przypiętym `userId`**.
- Nie ma przenoszenia statystyk gościa po rejestracji — nie ma czego przenosić.
- **Statystyki gościa po tokenie urządzenia — POZA MVP.** Zamiast tego po zakończonej grze
  gość widzi swój wynik i zachętę do założenia konta.
- **Ranking globalny budujemy wyłącznie z partii na kościach wirtualnych.** Przy kościach
  fizycznych nie ma jak zweryfikować, czy host nie wpisał sobie pięciu szóstek. Wyniki z kości
  fizycznych pokazujemy jako statystyki prywatne, poza rankingiem.
- Agregaty globalne trzymamy w osobnych tabelach przeliczanych w tle. Żadnego liczenia rankingu
  zapytaniem po całej historii przy każdym wejściu na stronę.

---

## 10. Stan gry i trwałość

Trzy elementy, bez których projekt się posypie w połowie:

1. **`revision`** — numer wersji stanu, rosnący przy każdej zatwierdzonej akcji. Po nim klient
   wie, czy jest aktualny, i po nim odbywa się dosyłanie zmian po ponownym połączeniu.
2. **Log zdarzeń** — tabela dopisywana wyłącznie na końcu, jeden wiersz na zatwierdzoną akcję.
   Daje odtworzenie partii i historię „kto co rzucił".
3. **Klucz idempotencji** przy akcjach — bez niego jedno kliknięcie przy słabym łączu zapisze
   się dwa razy.

Gra ma pola `status` (`LOBBY` / `TRWA` / `ZAKONCZONA` / `PORZUCONA` / `WYGASLA`) oraz
`ostatniaAktywnosc`. Sprzątaniem zajmuje się zadanie cykliczne (`@nestjs/schedule`).

Odświeżenie przeglądarki działa tak: wejście na `/game/[id]` → pobranie aktualnego stanu z API →
render → subskrypcja WebSocket. Klient nie trzyma stanu gry poza tym, co dostał z serwera.

Po ponownym połączeniu klient wysyła ostatnią znaną `revision`, a serwer dosyła brakujące
zdarzenia albo cały stan.

---

## 11. Stack

| Warstwa | Wybór | Status |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind | ustalone |
| Backend | NestJS | ustalone |
| Język | TypeScript wszędzie | ustalone |
| Baza | PostgreSQL | ustalone |
| Monorepo | pnpm workspaces (ew. Turborepo) | ustalone |
| Walidacja | Zod, schematy współdzielone przez web i api | ustalone |
| Realtime | Socket.IO (ma gotowy reconnect, backoff, heartbeat) | rekomendacja |
| ORM | Prisma albo Drizzle | **DO USTALENIA** |
| Auth | — | **DO USTALENIA** |
| Testy | Vitest (jednostkowe) + Playwright (e2e) | rekomendacja |
| Hosting | — | **DO USTALENIA** |

**Ważne przy hostingu:** NestJS z WebSocketami wymaga długo żyjącego procesu. Nie zadziała na
serverless. Next może stać osobno.

**Redis** będzie potrzebny dopiero przy trybie online z więcej niż jedną instancją API (pub/sub
między instancjami). Nie dodawaj go wcześniej.
