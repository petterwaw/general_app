# Design

Kierunek wizualny ustalony z właścicielem projektu (2026-09-24, poprawiony 2026-09-25) na
podstawie prototypu w artifakcie „Pastelowe sukno”
(https://claude.ai/artifact/EJXY5uukMcfcs1ZWdpJEcq). Kopia prototypu z 2026-09-25 leży
w repo: `docs/design/prototyp.html` — otwórz w przeglądarce, to wzorzec dla etapu 4.

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
| Awatary | **blobatar** (`blobatar` + `@blobatar/react`, generowane w przeglądarce, bez zapytań sieciowych), seed = **ID uczestnika**, odcień zablokowany na kolor gracza. Bez tła i obwódki — sam stworek. Ten sam awatar w tabeli, panelu Players i pasku tury |
| Kości | płaskie kości 2D w CSS, **bez animacji rzutu**. Taca: drewniany rant + fioletowe sukno, w czystym CSS |
| Suma punktów | **ukryta do końca gry** — w trakcie przy graczu widać „???” z kłódką, suma odsłania się po ostatniej rundzie. Tabela nie ma wiersza Total; suma jest tylko w panelu Players. **Postęp bonusu** (np. „53/63”) w wierszu Bonus jest widoczny w trakcie gry (ustalone 2026-09-25) |
| Nazwy kategorii (EN) | Ones, Twos, Threes, Fours, Fives, Sixes, One Pair, Two Pairs, Three of a Kind, Four of a Kind, Small Straight, Large Straight, Full House, Chance, **General**. Nigdy „Yahtzee” (znak towarowy) |

---

## Paleta — role

| Token | Rola |
|---|---|
| `ink` / `ink-muted` / `ink-faint` | tekst główny / drugorzędny / wygaszony (puste komórki) |
| `backdrop` | tło strony, jeden kolor |
| `primary` | **jedyny kolor akcji**: główny przycisk, zaznaczenie, podpowiedź punktów |
| `primary-soft` | kolumna aktywnego gracza, tła ikon, uchwyt szuflady Players |
| `secondary` | akcje drugorzędne („Leave game” — pełne różowe wypełnienie), obwódka aktywnego pola kości. Nigdy akcja główna |
| `surface` | półprzezroczyste karty z `backdrop-blur` |
| `felt`, `tray-rim` | taca z kośćmi: fioletowe sukno w drewnianym rancie — jedyny ciemny, nasycony obiekt na ekranie |
| `danger` | zapisane zero, usuwanie |
| `good` | potwierdzenia, zdobyty bonus |
| `player-1` … `player-8` | kolor gracza wg miejsca; ten sam w tabeli, awatarze i logu |

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
- **Komórki tabeli:** wpisany wynik / wolna (`–`) / podpowiedź dla aktywnego gracza (obwódka
  `primary`) / zaznaczona do zapisu (wypełnienie `primary` + ptaszek) / zero (`danger`) / sekcja
  dolna zablokowana (kreskowanie) / kolumna aktywnego gracza (`primary-soft`).
- **Przewijanie tabeli w bok:** kolumna z nazwami kategorii (i nagłówki sekcji) stoi w miejscu,
  przewijają się tylko kolumny graczy. Kolumna gracza ma min. 60 px; gdy wszyscy się mieszczą,
  dzielą szerokość po równo. Gdy nie — szerokość jest dobrana tak, żeby widać było **co
  najmniej 3,5 gracza**: wystająca połówka pokazuje, że da się przewinąć.
- **Pasek przewijania:** na ekranach dotykowych brak paska. Przy myszce (`pointer: fine`) cienki
  systemowy pasek pod tabelą w kolorach sukna (`scrollbar-color`), bo kółko myszy przewija
  tylko w pionie.
- **Architektura:** kości zawsze pokazują wartość już znaną (wpisaną przez hosta albo
  wylosowaną przez serwer). Bez `Math.random()` po stronie klienta.

## Układ ekranu gry

**Szerokość tacy zależy wyłącznie od szerokości okna**, nigdy od liczby graczy: 42% szerokości
obszaru gry, w granicach **440–600 px** (na telefonie nie szerzej niż ekran). Taca maleje razem
z oknem do 440 px. Liczba graczy decyduje tylko o tym, gdzie jest tabela — trzy tryby:

| Tryb | Co widać |
|---|---|
| Trzy kolumny | tabela · taca z kośćmi · karta Players + Game log |
| Dwie kolumny | tabela · taca z kośćmi; Players + Game log w szufladzie |
| Jedna pod drugą | taca z kośćmi na górze (ta sama szerokość co w innych trybach), tabela pod spodem (maks. 720 px); Players + Game log w szufladzie |

- Wybierany jest najbogatszy tryb, w którym **tabela mieści się obok tacy** (każdy gracz min.
  60 px, plus kolumna nazw kategorii). Panel Players ma stałe 340 px. Tak samo na każdym
  urządzeniu — tablet czy zwężone okno przechodzą do jednej kolumny, gdy tabela się nie mieści.
- W prototypie (okno → taca, tryb dla 4 / 8 graczy): 375 px → 328, jedna / jedna;
  916 px → 440, dwie / jedna; 1200 px → 474, dwie / dwie; 1440 px → 575, trzy / dwie;
  od 1600 px → 600, trzy / dwie (od 1920 px trzy).
- Kolumna siatki ma `minmax(0, …)`, żeby szeroka tabela przewijała się w swojej karcie, a nie
  rozpychała stronę.
- W trybach kolumnowych od 1200 px gra mieści się w wysokości ekranu (kolumny rozciągnięte,
  taca wyśrodkowana w pionie).
- **Szuflada Players + Game log** wysuwa się z prawej, z przyciemnionym tłem. Otwiera ją
  **cichy napis „Players” z okrągłym uchwytem ‹** (tło `primary-soft`) nad tacą, po prawej —
  widoczny, ale nie na pierwszym planie jak „Leave game” czy kod gry. Zamyka: krzyżyk, klik
  w tło, Esc. Przy zmianie trybu animacja wysuwania jest wyłączona (inaczej panel miga).

## Górny pasek

- Logo (kość) + nazwa, po prawej pole „Game code” z przyciskiem kopiowania i „Leave game”
  z ikoną drzwi ze strzałką. „Leave game” ma tę samą wysokość co pole kodu.
- Pasek się nie zawija. **Poniżej 560 px:** znika napis z nazwą (zostaje logo) i napis
  „Leave game” (zostaje ikona drzwi, z `aria-label`); pole kodu i przyciski się zmniejszają.
