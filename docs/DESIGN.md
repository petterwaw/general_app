# Design

Kierunek wizualny ustalony z właścicielem projektu (2026-09-24, poprawiony 2026-09-25) na
podstawie prototypu w artifakcie „Pastelowe sukno”
(https://claude.ai/artifact/EJXY5uukMcfcs1ZWdpJEcq). Kopia prototypu z 2026-09-25 leży
w repo: `docs/design/prototyp.html` — otwórz w przeglądarce, to wzorzec dla etapu 4.
**Ekran gry odszedł od prototypu** (2026-09-25, po złożeniu go z komponentów): brak górnego
paska, tabela przy lewej krawędzi, panel graczy bez karty i nagłówków, Chance na dole tabeli.
Gdzie prototyp i ten plik się różnią, obowiązuje ten plik.

Tokeny są w `apps/web/src/app/globals.css` (Tailwind v4, `@theme`) — to jedyne źródło
wartości. Ten plik opisuje, **jak** ich używać.

---

## Ustalenia

| Temat | Decyzja |
|---|---|
| Język interfejsu | **angielski** |
| Krój pisma | **Nunito** (400/600/700/800), jeden krój na wszystko, cyfry `tabular-nums` |
| Motyw | jeden, jasny — pastelowa lawenda i róż. Tryb ciemny nie był omawiany |
| Tło | **jeden statyczny kolor** (`backdrop`). Bez sceny 3D, bez paralaksy, bez gradientu (2026-09-25 — scena three.js odrzucona) |
| Cienie | **brak cieni pod elementami** (karty, przyciski, taca, pasek tury). Kości mają tylko pełną dolną krawędź (`shadow-die`) — to ich grubość, nie cień |
| Awatary | **blobatar** (`blobatar` + `@blobatar/react`, generowane w przeglądarce, bez zapytań sieciowych), seed = **ID uczestnika**, odcień zablokowany na kolor gracza. Bez tła i obwódki — sam stworek. Ten sam awatar w tabeli, panelu Players i pasku tury. **Oczy podążają za kursorem** (`useGaze` z `@blobatar/react/gaze`, zasięg 5); oddychanie i mruganie tylko po najechaniu (`animate="hover"`). Biblioteka wyłącza to na ekranach dotykowych i przy `prefers-reduced-motion` (ustalone 2026-09-25) |
| Kości | płaskie kości 2D w CSS, **bez animacji rzutu**. Taca: drewniany rant + fioletowe sukno, w czystym CSS |
| Suma punktów | **ukryta do końca gry** — w trakcie gry przy graczu **nie ma żadnego pola sumy** (bez „???”, zmienione 2026-09-26); suma pojawia się w panelu Players dopiero po zakończeniu gry. Jak ma wyglądać ekran końca gry — do ustalenia później. Tabela nie ma wiersza Total. **Postęp bonusu** (np. „53/63”) w wierszu Bonus jest widoczny w trakcie gry (ustalone 2026-09-25) |
| Nazwy kategorii (EN) | Ones, Twos, Threes, Fours, Fives, Sixes, One Pair, Two Pairs, Three of a Kind, Four of a Kind, Small Straight, Large Straight, Full House, **General**, a na samym dole osobno **Chance** — po małej przerwie bez podpisu, bo nigdy nie jest zablokowana (ustalone 2026-09-25). Nigdy „Yahtzee” (znak towarowy) |

---

## Paleta — role

| Token | Rola |
|---|---|
| `ink` / `ink-muted` / `ink-faint` | tekst główny / drugorzędny / wygaszony (puste komórki) |
| `backdrop` | tło strony, jeden kolor |
| `primary` | **jedyny kolor akcji**: główny przycisk, zaznaczenie, podpowiedź punktów |
| `primary-soft` | kolumna aktywnego gracza w tabeli, tła ikon, uchwyt szuflady Players. Lista graczy **nie** wyróżnia aktywnego gracza — pokazują to tabela i pasek tury |
| `secondary` | akcje drugorzędne („Leave game” — pełne różowe wypełnienie), obwódka aktywnego pola kości. Nigdy akcja główna |
| `secondary-ink` | tekst na różowym = `ink` (kontrast ~6,6:1; fiolet dawał ~3,8:1, biały ~2,2:1) (2026-09-25) |
| `surface` | półprzezroczyste karty z `backdrop-blur` |
| `surface-flat` | nieprzezroczysty odpowiednik `surface` na tle `backdrop` — dla przyklejonych komórek, które mają zlać się z kartą (pusty róg tabeli) |
| `felt`, `tray-rim` | taca z kośćmi: fioletowe sukno w drewnianym rancie — jedyny ciemny, nasycony obiekt na ekranie |
| `danger` | zapisane zero, usuwanie |
| `good` | potwierdzenia, zdobyty bonus |
| kolory graczy | kolor gracza wg miejsca; ten sam w tabeli, awatarze i logu. **Nie są tokenem w `globals.css`** (zmienione 2026-09-25) — jedno źródło to `PLAYER_COLORS` w `components/players/playerColors.ts` (oklch), bo awatar potrzebuje samego odcienia jako liczby; `playerColor(seat)` daje pełny kolor, `playerHue(seat)` odcień |

## Zasady

- **Sukno jest bohaterem.** Wszystko wokół jasne i spokojne.
- **Czytelne z odległości.** Wyniki ogląda kilka osób przy stole — cyfry duże, grube, tabelaryczne.
- **Wpisywanie kości — jak pole kodu w authenticatorze.** Na suknie 5 pól w rzędzie (puste
  pokazuje „–”, aktywne ma obwódkę `secondary`). Pod tacą sześć samych kości (bez ramek) do
  wyboru wartości: klik wpisuje wartość do aktywnego pola i **zawsze przeskakuje na następne**;
  po piątym wpisywanie się kończy, a kości wyboru się wygaszają. Klik w wypełnione pole robi je
  znowu aktywnym (poprawka). Przycisk „Confirm” aktywny dopiero, gdy wszystkie 5 pól jest
  wypełnionych. Bez nagłówków i napisów pomocniczych.
- **Wybór kategorii — dwa kliknięcia** (ustalone 2026-09-25). Dopiero po „Confirm” w wolnych
  polach aktywnego gracza pojawiają się podpowiedzi punktów (obwódka `primary`). Pierwszy klik
  w pole zaznacza kategorię (wypełnienie `primary`) i pokazuje obok okrągły **ptaszek**
  w kolorze `good`; dopiero klik w ptaszek zapisuje. Klik gdziekolwiek indziej albo Esc anuluje
  zaznaczenie. Poprawienie kości po „Confirm” chowa podpowiedzi do ponownego potwierdzenia.
  Podpowiedź jest tylko podpowiedzią — punkty zawsze przelicza serwer (`DECYZJE.md` §4).
- **Rozmiar kości liczony od szerokości kolumny z tacą** (container query, `cqi`), nie od okna —
  inaczej taca wychodzi poza swoją kolumnę.
- **Pasek tury** („Kuba's turn · round 7 of 15”) na dolnej krawędzi tacy, z awatarem gracza.
  Poniżej 340 px szerokości ekranu jest delikatnie pomniejszony (90%) (2026-09-26).
- **Komórki tabeli:** wpisany wynik / wolna (`–`) / podpowiedź dla aktywnego gracza (obwódka
  `primary`) / zaznaczona do zapisu (wypełnienie `primary` + ptaszek) / zero (`danger`) / sekcja
  dolna zablokowana (kreskowanie) / kolumna aktywnego gracza (`primary-soft`). Zmiana stanu
  komórki nie zmienia jej wymiarów — podpowiedź nie jest wyższa od pustego pola, a ptaszek jest
  poza przepływem. Ptaszek stoi na prawo od pola, a **w ostatniej kolumnie na lewo**, bo po
  prawej ucinałaby go krawędź tabeli (2026-09-26).
- **Nagłówek tabeli — same awatary, bez imion** (2026-09-26). Imiona są w panelu Players
  (w tabeli zostają tylko jako podpowiedź po najechaniu i dla czytników ekranu).
- **Przewijanie tabeli w bok:** kolumna z nazwami kategorii (i nagłówki sekcji) stoi w miejscu,
  przewijają się tylko kolumny graczy. Kolumna gracza ma min. 60 px; gdy wszyscy się mieszczą,
  dzielą szerokość po równo. Gdy nie — szerokość jest dobrana tak, żeby widać było **co
  najmniej 3,5 gracza**: wystająca połówka pokazuje, że da się przewinąć.
  **Kółko myszy nad tabelą przesuwa graczy w poziomie** (na krawędzi przewija dalej stronę);
  wiersze w pionie tylko suwakiem. **Przy zmianie tury tabela płynnie przesuwa się tak, żeby
  aktywny gracz był pierwszą kolumną za nazwami kategorii** (przy ostatnich graczach zatrzymuje
  się na końcu); przy wejściu na ekran bez animacji (2026-09-26).
- **Promienie** (ustalone 2026-09-26): przyciski są pigułkami. **Karty menu** (`/games`,
  tworzenie gry, lobby, karta niedokończonej gry) mają `radius-card` = 52 px — koncentrycznie
  z pigułką przycisku `lg` przy ich dolnej krawędzi (promień pigułki ≈ 30 + padding 22), więc
  przycisk w takiej karcie jest zawsze `lg`. **Karta tabeli wyników** to „plansza”:
  `radius-board` = 28 px, bo 52 przy paddingu 12 zjadałoby komórki. `Card` dobiera promień
  z paddingu (`default` → `card`, `compact` → `board`). Elementy w środku karty (wiersze graczy
  20, input 14) nie muszą być koncentryczne — nie stykają się z rogami. **Tekst przy rogach**
  (nagłówki, akapity) jest w kartach menu wcięty o dodatkowe 8 px (`px-2`), bo przy 52 px sam
  padding wygląda ciasno; przyciski zostają na pełną szerokość.
- **Zewnętrzne rogi tabeli** mają promień karty (`radius-board`) minus jej padding
  (28 − 12 = 16 px), żeby oba łuki miały wspólny środek. Środkowe wiersze zostają przy 10 px.
- **Pasek przewijania** (tabela i lista graczy, klasa `scrollbar-soft`, zmienione 2026-09-26):
  na ekranach dotykowych brak paska. Przy myszce (`pointer: fine`) cienki pasek (8 px)
  z zaokrąglonymi końcami, uchwyt w kolorze sukna (`felt`), **bez strzałek**. Pasek tabeli
  biegnie **tylko pod kolumnami graczy**, od prawej krawędzi kolumny nazw. W Firefoksie pasek
  jest cienki i w tych kolorach, ale na całą szerokość (nie da się skrócić toru).
- **Architektura:** kości zawsze pokazują wartość już znaną (wpisaną przez hosta albo
  wylosowaną przez serwer). Bez `Math.random()` po stronie klienta.

## Układ ekranu gry

**Szerokość tacy zależy wyłącznie od szerokości okna**, nigdy od liczby graczy: 42% szerokości
obszaru gry, w granicach **440–600 px** (na telefonie nie szerzej niż ekran). Taca maleje razem
z oknem do 440 px. Liczba graczy decyduje tylko o tym, gdzie jest tabela — trzy tryby:

| Tryb | Co widać |
|---|---|
| Trzy kolumny | tabela · taca z kośćmi · „Leave game” + Players + Game log (bez karty) |
| Dwie kolumny | tabela · taca z kośćmi; Players + Game log w szufladzie |
| Jedna pod drugą | taca z kośćmi na górze (ta sama szerokość co w innych trybach), tabela pod spodem (maks. 720 px); Players + Game log w szufladzie |

- Wybierany jest najbogatszy tryb, w którym **tabela mieści się obok tacy** (każdy gracz min.
  60 px, plus kolumna nazw kategorii). Panel Players ma stałe 340 px. Tak samo na każdym
  urządzeniu — tablet czy zwężone okno przechodzą do jednej kolumny, gdy tabela się nie mieści.
- W prototypie (okno → taca, tryb dla 4 / 8 graczy): 375 px → 328, jedna / jedna;
  916 px → 440, dwie / jedna; 1200 px → 474, dwie / dwie; 1440 px → 575, trzy / dwie;
  od 1600 px → 600, trzy / dwie (od 1920 px trzy).
- **Tabela nie rozciąga się na całą wolną szerokość** (2026-09-25): karta ma szerokość swojej
  treści (kolumna gracza docelowo 88 px), ale **min. 600 px**, i stoi przy lewej krawędzi. Gdy
  obok tacy i panelu nie ma tyle miejsca, zwęża się do dostępnego. Taca stoi na środku
  pozostałej przestrzeni, gracze przy prawej krawędzi.
- Kolumna siatki ma `minmax(0, …)`, żeby szeroka tabela przewijała się w swojej karcie, a nie
  rozpychała stronę.
- **W trybach kolumnowych gra wypełnia wysokość okna** przy każdej szerokości (2026-09-25):
  karty rozciągnięte na całą wysokość, taca wyśrodkowana w pionie, strona nie przewija się
  w pionie. Za niskie okno (poniżej ok. 660 px) przewija się normalnie.
- **Panel graczy bez karty i bez nagłówków** (2026-09-25): same wiersze graczy, pod nimi log,
  bez napisów „Players” / „Game log” i bez kreski oddzielającej. Wiersz gracza: awatar i imię,
  **bez znaczka „Host”** (w trybie lokalnym zbędny) i bez sumy w trakcie gry (2026-09-26).
- **Log gry** (2026-09-26): wpisy na tle, **najnowszy na górze**, tuż pod graczami — „Game
  started”, „Anna rolled 6 6 6 2 3”, „Anna scored 18 in Sixes” (zero w `danger`). Kropka
  w kolorze gracza, godzina w `ink-muted`. Nowy wpis wsuwa się łagodnie z góry (450 ms, bez
  animacji przy `prefers-reduced-motion`). **Log się nie przewija** — co się nie mieści, jest
  ucięte, a dół płynnie zanika, jakby stare wpisy tonęły w tle.
- **Podział wysokości panelu** (2026-09-26): log ma co najmniej 30% wysokości ekranu, gracze
  resztę. Gdy gracze się nie mieszczą, ich lista się przewija, a krawędź, za którą są ukryci
  gracze (góra i/lub dół), zanika. Tak samo w szufladzie i w trzeciej kolumnie.
- **Szuflada Players + Game log** wysuwa się z prawej, z przyciemnionym tłem. Otwiera ją
  **cichy napis „Players” z okrągłym uchwytem ‹** (tło `primary-soft`) przy prawej krawędzi
  ekranu — widoczny, ale nie na pierwszym planie jak „Leave game”, który stoi w tym samym
  wierszu przy lewej krawędzi. Zamyka: krzyżyk, klik w tło, Esc. Przy zmianie trybu animacja wysuwania jest
  wyłączona (inaczej panel miga). Szuflada ma u góry odstęp na krzyżyk, bo nie ma nagłówka.

## „Leave game” zamiast górnego paska

**Górnego paska nie ma** (2026-09-25) — gra zaczyna się od górnej krawędzi okna. Bez logo,
nazwy i pola „Game code” (krótki kod dołączania to etap 6; wtedy trzeba zdecydować, gdzie go
pokazać). „Leave game” z ikoną drzwi ze strzałką stoi:

- w trybie trzech kolumn — nad listą graczy, wyrównany do prawej,
- w pozostałych — w wierszu **nad tabelą i tacą, przy lewej krawędzi ekranu**, a uchwyt
  szuflady „Players ‹” przy prawej (zmienione 2026-09-26: wcześniej wiersz miał szerokość tacy,
  np. na iPadzie mini przyciski nie sięgały krawędzi).

Poniżej 560 px znika napis „Leave game” (zostaje ikona drzwi, z `aria-label`). Komponent
`TopBar` zostaje w kodzie, ale nie jest używany.
