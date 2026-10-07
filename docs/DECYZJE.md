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
| Online | Każdy gracz na swoim urządzeniu, dołącza przez zaproszenie (link / kod) | w zakresie (od 2026-09-28) |

**Oś B — skąd biorą się kości:**

| Źródło | Opis | Dostępne w |
|---|---|---|
| Fizyczne | Prawdziwe kości na stole, host wpisuje wyniki ręcznie | tylko tryb lokalny |
| Wirtualne | Losuje serwer | tylko tryb online (ustalone 2026-09-28) |

W trybie online kości fizyczne **nie istnieją**, a w lokalnym — wirtualne.

**Online bez kont** (ustalone 2026-09-28): każdy gracz online jest gościem rozpoznawanym po
sekrecie w ciasteczku urządzenia, tak jak dziś host. Dołączanie przez link / kod zaproszenia;
matchmaking może dojść później.

**Kod zaproszenia** (ustalone 2026-10-04):

- 6 znaków, litery i cyfry bez mylących się par (`0/O`, `1/I`); wielkość liter bez znaczenia.
- Działa przez całą grę: w lobby dołącza jako gracz, w trakcie gry przenosi do oglądania.
- Po zakończeniu gry (także porzuceniu) kod się zwalnia i może trafić do innej gry.
- Lobby udostępnia kod, nie link.

**Liczba graczy w grze lokalnej: od 1 do 8** (ustalone 2026-09-24). Limit egzekwuje serwer —
zarówno przy tworzeniu gry, jak i przy dołączaniu (`MAX_PLAYERS` w `packages/contracts`).
Dla trybu online obowiązuje osobno 1–5 (zmienione 2026-10-01 z 2–5) — można zacząć grę samemu.

---

## 2. Role uczestników

| Rola | Uprawnienia |
|---|---|
| `HOST` | Jedyny, kto wykonuje akcje w trybie lokalnym. Wpisuje wyniki wszystkich graczy. Może wyrzucić gracza — **tylko w lobby, przed startem** (ustalone 2026-09-25). |
| `GRACZ` | Dołączył przez QR, zalogował się kontem. **Tylko podgląd** — nie może nic edytować. Jego statystyki się zapisują. |
| `OBSERWATOR` | Dołączył przez QR, nie ma konta lub nie chce grać. Tylko podgląd. |

**Uproszczenie implementacyjne:** `GRACZ` i `OBSERWATOR` to technicznie ten sam mechanizm —
klient tylko do odczytu. Jedyna różnica polega na tym, czy do slotu uczestnika w partii przypięte
jest konto użytkownika. Nie buduj dwóch osobnych ścieżek.

**Widz bez roli** (ustalone 2026-09-27): kto zna ID gry, a nie jest jej hostem, może ją tylko
oglądać. Nie jest uczestnikiem i nic nie trafia do bazy (`GameView.isHost`).

Rola jest polem na rekordzie uczestnika, nie wynika z kolejności na liście. Host identyfikuje się
tokenem zapisanym na urządzeniu (sekret w cookie), sprawdzanym przy każdej akcji. Samo ID gry nie
może wystarczać do bycia hostem.

**W trybie online host tylko startuje grę i zarządza lobby** (zmienione 2026-09-30).
Zakładający dołącza do swojej gry jako zwykły gracz z rolą `HOST`, która daje dwa uprawnienia:
start gry z lobby i usuwanie graczy — **tylko w lobby, przed startem**, tak jak w trybie
lokalnym. W trakcie gry wszyscy mają ten sam poziom dostępu — każdy rusza tylko swoimi kośćmi
i nikt nie może nikogo wyrzucić. Usuwanie gracza w trakcie gry może dojść później.

---

## 3. Dołączanie przez QR (tryb lokalny)

- Host wyświetla na swoim ekranie kod QR oraz krótki kod tekstowy (do przepisania ręcznie).
- Po zeskanowaniu osoba wybiera: dołączyć jako gracz (wymaga zalogowania) albo jako obserwator.
- Po zalogowaniu uczestnik wyświetla się na liście jako gracz zalogowany, a jego wynik z tej
  partii wchodzi do jego statystyk.
- **Nikt dołączony przez QR nie może edytować niczego.** Wpisywanie wyników pozostaje wyłącznie
  po stronie urządzenia hosta.
- **`POST /games/:id/join` zostaje** (ustalone 2026-09-24). Posłuży do dodawania graczy
  w lobby przed kliknięciem „start" oraz w trybie online.
- **W trybie lokalnym `join` może wołać tylko host** (ustalone 2026-09-25) — wymagane
  ciasteczko hosta (`verifyHost`), tak jak przy pozostałych akcjach hosta. Dołączanie przez kod
  (QR / krótki kod) dojdzie później osobną ścieżką.

---

## 4. Przebieg tury i cofanie

Model, na którym opiera się cała mechanika cofania:

**Tura w trakcie = szkic (edytowalny). Tura zatwierdzona = zdarzenie (nieodwracalne).**

Dopóki gracz nie zapisze kategorii, wszystko w jego turze jest szkicem: wykonane rzuty, odłożone
kości, wpisane wartości kości fizycznych. Poprawki w obrębie szkicu są dozwolone i darmowe —
zakładamy, że host mógł się pomylić przy przepisywaniu.

**Wyjątek przy kościach fizycznych** (ustalone 2026-09-28): wpisane kości można poprawiać tylko
do „Confirm”. Po zatwierdzeniu są zablokowane, a szkicem pozostaje już tylko wybór kategorii.
Poprawianie kości po „Confirm” może kiedyś dojść — bez terminu.

W momencie zapisania kategorii szkic zamienia się we wpis w logu zdarzeń i **nie da się go
cofnąć**. Nie implementuj zdarzeń kompensacyjnych ani cofania całych tur.

**W trybie online nie ma czego cofać** — gracz nigdy nie wpisuje wartości kości, dostaje je
z serwera. Edytowalne jest wyłącznie to, które kości odkłada przed kolejnym rzutem.

**Tura na kościach wirtualnych** (ustalone 2026-09-29):

- Każdy rusza tylko swoimi kośćmi — rzuca i zapisuje wyłącznie gracz, którego jest tura.
- **Pierwszy rzut wykonuje się sam** na starcie tury, w tej samej transakcji co zapis kategorii
  poprzedniego gracza (albo start gry). Nie ma stanu „tura bez kości” widocznego dla graczy.
- Po każdym rzucie gracz może zapisać kategorię albo rzucić jeszcze raz — **najwyżej 3 rzuty**.
- Przed rzutem 2 i 3 gracz wybiera kości do zatrzymania; przelosowują się tylko pozostałe.
  Wybór jest dowolny przy każdym rzucie — kość zatrzymaną wcześniej można odblokować.
- Wybór zatrzymanych kości przed rzutem jest szkicem na urządzeniu gracza; inni widzą dopiero
  wynik rzutu, a w nim, które kości zostały zatrzymane.
- Punkty liczą się z kości na stole znanych serwerowi — akcja zapisu kategorii nie niesie kości.
- Akcja zapisu kategorii online nie niesie też gracza (ustalone 2026-09-30) — zapisuje ten,
  czyje jest urządzenie. Przysłany gracz jest odrzucany, a nie pomijany po cichu.

Krok potwierdzenia przed zapisem kategorii to decyzja frontendowa — ustalona 2026-09-25: dwa
kliknięcia (zaznaczenie pola, potem ptaszek), szczegóły w `DESIGN.md`. Silnik gry dostaje gotową
akcję „zapisz kategorię X" i nie musi o tym nic wiedzieć.

**Śledzenie kolejnych rzutów różni się między kośćmi fizycznymi a wirtualnymi.** Przy kościach
wirtualnych serwer sam rzuca i musi pilnować liczby rzutów (max. 3) oraz tego, które kości
zostały odłożone między rzutami — to on jest jedynym źródłem prawdy o przebiegu tury. Przy
kościach fizycznych ludzie rzucają przy stole, poza kontrolą aplikacji, więc reducer **nie**
modeluje osobno rzutu 1/2/3 ani nie waliduje „czy odłożone kości pochodzą z bieżącego rzutu" —
host wpisuje końcowy wynik tury (dowolnie go poprawiając w obrębie szkicu, patrz wyżej) i to
jedyne, co aplikacja o tym wie. Reducer ma więc dwa różne zestawy walidacji zależnie od źródła
kości, nie jeden uniwersalny.

**Akcja nigdy nie niesie gotowego wyniku.** `saveCategory` przekazuje surowe kości oraz wybraną
przez gracza kategorię — punkty przelicza reducer, po swojej stronie. Wybór kategorii przychodzi
z zewnątrz (host klika w UI), ale wynik nigdy. Podpowiedź „ta kategoria da Ci X punktów"
wyświetlana w interfejsie jest wyłącznie podpowiedzią; nic, co przyszło od klienta, nie może
zostać zapisane jako punkty bez przeliczenia. To dotyczy również wymuszonego zera — o tym, że
zapis daje 0, decyduje reducer, nie klient.

---

## 5. Host wychodzi z gry (tryb lokalny)

- Host może wrócić do gry po zamknięciu przeglądarki. **Ciasteczko urządzenia żyje 90 dni
  i przedłuża się przy każdym wejściu na stronę** (ustalone 2026-09-28) — wygasa dopiero po
  90 dniach bez wizyty. Dotyczy też graczy online.
- **Gra lokalna nie wygasa** (zmienione 2026-09-28) — trwa, dopóki host jej nie opuści albo nie
  dogra. Status `EXPIRED` zostaje w bazie, ale nic go nie ustawia. Gra online skończy się sama,
  gdy dojdą limity na ruch (§7).
- **Przekazanie hosta innemu urządzeniu przed wyjściem — POZA MVP.** Ale rola ma być polem na
  uczestniku już teraz, żeby dodanie tego później było zmianą jednej wartości, a nie przepisaniem
  logiki uprawnień.
- **Host prowadzi jedną grę naraz** (ustalone 2026-09-25). Żeby założyć nową, musi najpierw
  opuścić poprzednią. Skoro gra jest jedna, jedno ciasteczko `host_secret` na urządzenie wystarcza.
  **Zasada obejmuje oba tryby** (rozszerzone 2026-09-29): urządzenie jest naraz w jednej
  aktywnej grze (`LOBBY` / `IN_PROGRESS`), lokalnej albo online, jako host albo gracz. Pilnuje
  tego baza — częściowy indeks unikalny na aktywnych uczestnictwach urządzenia, nie tylko
  sprawdzenie w serwisie. **Do czasu kont „host” = urządzenie** (ciasteczko) — z innego urządzenia
  serwer nie wie, że to ta sama osoba; „jedna gra na osobę” daje dopiero indeks na `userId`
  z §6. **UI na `/games`** (zmienione 2026-09-25): gdy host ma grę w `LOBBY` / `IN_PROGRESS`,
  zamiast przycisków „Create game” / „Join game” widzi jedną kartę z graczami tej gry,
  przyciskiem „Back to the game” i cichym napisem „Leave game” obok. Dopóki nie wiadomo, czy
  gra jest (trwa `GET /games/hosted`), ekran jest pusty — żeby nie mignął „Create game”.
- **Host opuszcza grę → gra dostaje status `ABANDONED`** (ustalone 2026-09-25). Zwalnia to
  slot „jednej gry”; gra porzucona nie liczy się do statystyk (§8). Po wyjściu z ekranu gry
  host trafia na `/games`; osoby oglądające (etap 6) mają dostać zaktualizowany, zablokowany
  ekran z informacją, że gra się skończyła (ustalone 2026-09-25). Przed wyjściem jest potwierdzenie
  (ustalone 2026-09-27): przycisk ciemnieje i pyta „Leave?” z ptaszkiem i krzyżykiem.
- **Gracz opuszcza grę → wypada tylko on, gra trwa dalej** (ustalone 2026-09-25, do
  zaimplementowania razem z kontami — dziś poza hostem nikt nie ma urządzenia). Jego zapisane
  punkty zostają, wolne kategorie dostają 0, jego kolumna w tabeli jest przyciemniona, a jego
  tury są pomijane.
- **Wyjście z gry online** (ustalone 2026-10-01):
  - W trakcie gry każdy, także host, wychodzi jak gracz wyżej — zera w wolnych kategoriach,
    gra trwa dalej. Kto zostanie sam, dogrywa do końca; porzucona jest dopiero gra, z której
    wyszli wszyscy (§8).
  - W lobby zwykły gracz po wyjściu znika z gry. Wyjście hosta z lobby porzuca całą grę, bo
    tylko on może ją wystartować.

---

## 6. Jedno konto = jedna aktywna gra

**Konta są odłożone** (2026-09-28). Do tego czasu tożsamością jest urządzenie (ciasteczko),
a zasady z tej sekcji obowiązują dopiero z kontami.

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

**Odłożone** (2026-09-28): online startuje bez limitu na turę; limit i wyrzucanie dojdą, gdy
gra online będzie działać. Do tego czasu nieaktywny gracz blokuje partię, dopóki pozostali
nie wyjdą.

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

**Tryb online** (zmienione 2026-10-01): gra trwa, dopóki zostaje w niej choć jedna osoba —
kto zostanie sam, dogrywa do końca i gra kończy się normalnie, z wynikami. Gra, z której
wyszli wszyscy, ma status `PORZUCONA` i **nie wchodzi do statystyk**. Czy do statystyk wchodzi
gra dograna przez osobę, która została sama — `DO-USTALENIA.md`.

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
| Walidacja | Zod, schematy współdzielone przez web i api (`packages/contracts`) | ustalone (potwierdzone 2026-09-24) |
| Realtime | Socket.IO (ma gotowy reconnect, backoff, heartbeat) | ustalone (2026-09-28) |
| ORM | Prisma | ustalone |
| Auth | — | **DO USTALENIA** |
| Testy | Vitest (jednostkowe) + Playwright (e2e) | rekomendacja |
| Hosting | AWS EC2 (Sztokholm), docker compose: Caddy, web, api, Postgres; deploy po zielonym CI na `main` | ustalone (2026-10-05) |
| Analityka | Umami Cloud — bez ciasteczek, więc bez banera zgody | ustalone (2026-10-05) |

**Ważne przy hostingu:** NestJS z WebSocketami wymaga długo żyjącego procesu. Nie zadziała na
serverless. Next może stać osobno.

**Kontrakt API** (ustalone 2026-09-24): schematy żądań (Zod) oraz typy odpowiedzi
(`GameView`, `ParticipantView`, koperta `ApiResponse`) żyją w `packages/contracts` i importują
je oba końce. Serwer zwraca wyłącznie kształt z kontraktu — jedno miejsce mapowania
(`toGameView`) decyduje, które pola wychodzą; pola wewnętrzne (`creationKey`, `identityId`,
`userId` itp.) nigdy nie trafiają do klienta. `class-validator` nie jest używany.

**Nie ma listy wszystkich gier** (ustalone 2026-10-07). `GET /games` usunięty — ujawniał ID
każdej gry (a ID wystarcza do oglądania) i czytał całą bazę naraz. Lista gier do dołączenia
albo historia gier gracza, jeśli kiedyś dojdą, to osobne zapytania z filtrem i stronicowaniem.

**Przy Prismie — do sprawdzenia na etapie 3:** częściowy indeks unikalny wymagany przez §6
(jedno konto = jedna aktywna gra) prawdopodobnie nie da się wyrazić w `schema.prisma` — trzeba
go dopisać ręcznie jako SQL w wygenerowanej migracji. Zweryfikować w aktualnej dokumentacji
przy budowie schematu.

**Redis** będzie potrzebny dopiero przy trybie online z więcej niż jedną instancją API (pub/sub
między instancjami). Nie dodawaj go wcześniej.

---

## 12. Wygląd i język (ustalone 2026-09-24)

- Nazwa aplikacji: **Dice Table**, domena `dice-table.com` (ustalone 2026-10-05). Identyfikatory
  w kodzie i konfiguracji (`dice-app`) zostają.
- Interfejs jest **po angielsku**.
- Krój pisma: **Nunito**. Paleta, tokeny i zasady stylu: `DESIGN.md` (wartości w
  `apps/web/src/app/globals.css`).
- Awatary: **blobatar**, generowane w przeglądarce z **ID uczestnika**.
- Kości i tło (zmienione 2026-09-25): **statyczne tło w jednym kolorze, kości 2D w CSS, bez
  animacji rzutu**. Scena three.js z paralaksą została odrzucona. Kości pokazują wyłącznie wynik
  znany z serwera — patrz zasada architektoniczna w `CLAUDE.md`.
- Układ ekranu gry dopasowuje się do miejsca (trzy kolumny / dwie / jedna pod drugą; szerokość
  tacy zależy tylko od okna, 440–600 px), a Players + Game log chowają się do wysuwanej
  szuflady — szczegóły w `DESIGN.md`.

---

## 13. Wynik końcowy i log gry (ustalone 2026-09-25)

**Sumę i bonus liczy serwer.** Bonus sekcji górnej (próg 63 → +35) i suma punktów to funkcje
`game-core` (`upperBonus`, `totalScore`). Front może ich używać do wyświetlania, ale o wyniku
rozstrzyga serwer.

**Wynik końcowy jest zapisywany w bazie** (`Participant.finalScore`, `Participant.upperBonus`)
w chwili zakończenia gry, w tej samej transakcji co ostatni zapis kategorii. Do tego momentu
oba pola są puste. To zapis partii takiej, jaka była rozegrana — gdyby zasady punktowania się
kiedyś zmieniły, stare wyniki się nie przeliczają. Z tych pól korzysta etap 8 (statystyki).
Pola „zwycięzca" nie ma — remis (dwie osoby wygrywają) wynika z porównania zapisanych wyników.

**Wynik końcowy wychodzi do klienta dopiero po zakończeniu gry** — `toGameView` wypełnia
`finalScore`/`upperBonus` tylko przy statusie `COMPLETED`. Postęp bonusu (np. „53/63") jest
za to widoczny w trakcie gry.

**Punkty zapisanej kategorii trafiają do logu zdarzeń** — przeliczone przez reducer, nigdy
przyjęte od klienta.

**Log gry wystawiony dla klienta** (`GET /games/:id/events?after=<revision>`) zawiera tylko:

- start gry,
- kości wpisane w turze (wszystkie 5),
- każdy rzut kośćmi wirtualnymi — z kośćmi po rzucie i tym, które zostały zatrzymane
  (ustalone 2026-09-29),
- zapisaną kategorię z punktami,
- wyjście gracza z gry w trakcie partii (ustalone 2026-10-01).

Pozostałe zdarzenia (np. dołączenie gracza) zostają w bazie, ale nie wychodzą na zewnątrz.
Ekran gry dostaje nowe wpisy logu przez WebSocket razem ze stanem gry. Po ponownym połączeniu
podaje ostatni wpis, który ma, i serwer dosyła brakujące (§10).
