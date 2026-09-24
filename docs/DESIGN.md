# Design

Kierunek wizualny ustalony z właścicielem projektu (2026-09-24) na podstawie `docs/mockup.png`
i prototypu w artifakcie „Pastelowe sukno” (https://claude.ai/artifact/EJXY5uukMcfcs1ZWdpJEcq).
Mockup jest wygenerowany — liczy się **styl**, nie szczegóły (nazwa, liczba kategorii, czat
z mockupu nie obowiązują).

Tokeny są w `apps/web/src/app/globals.css` (Tailwind v4, `@theme`) — to jedyne źródło
wartości. Ten plik opisuje, **jak** ich używać.

---

## Ustalenia

| Temat | Decyzja |
|---|---|
| Język interfejsu | **angielski** |
| Krój pisma | **Nunito** (400/600/700/800), jeden krój na wszystko, cyfry `tabular-nums` |
| Motyw | jeden, jasny — pastelowa lawenda i róż. Tryb ciemny nie był omawiany |
| Awatary | **blobatar** (`blobatar` + `@blobatar/react`, generowane w przeglądarce, bez zapytań sieciowych), seed = **ID uczestnika**, odcień zablokowany na kolor gracza. Bez tła i obwódki — sam stworek |
| Kości i tło | jedna scena **three.js** za całym interfejsem: stół, miska z rantem i suknem, kości, rekwizyty (poduszki, kubek, notes). Kamera lekko reaguje na kursor (paralaksa). Wdrożenie — kolejny krok, nie w tym |
| Nazwy kategorii (EN) | Ones, Twos, Threes, Fours, Fives, Sixes, One Pair, Two Pairs, Three of a Kind, Four of a Kind, Small Straight, Large Straight, Full House, Chance, **General**. Nigdy „Yahtzee” (znak towarowy) |

---

## Paleta — role

| Token | Rola |
|---|---|
| `ink` / `ink-muted` / `ink-faint` | tekst główny / drugorzędny / wygaszony (puste komórki) |
| `primary` | **jedyny kolor akcji**: główny przycisk, zaznaczenie, podpowiedź punktów |
| `primary-soft` | kolumna aktywnego gracza, tła ikon |
| `secondary` | akcje drugorzędne („Leave game”), wybrana kość. Nigdy akcja główna |
| `surface` | półprzezroczyste karty z `backdrop-blur` |
| `felt`, `tray-rim` | miska z kośćmi — jedyny ciemny, nasycony obiekt na ekranie |
| `danger` | zapisane zero, usuwanie |
| `good` | potwierdzenia, zdobyty bonus |
| `player-1` … `player-8` | kolor gracza wg miejsca; ten sam w tabeli, awatarze i logu |

## Zasady

- **Sukno jest bohaterem.** Wszystko wokół jasne i spokojne.
- **Czytelne z odległości.** Wyniki ogląda kilka osób przy stole — cyfry duże, grube, tabelaryczne.
- **Gra mieści się w wysokości ekranu** (desktop od 1200 px): tabela wyników po lewej, miska
  i wybór kości wyśrodkowane w pionie pośrodku, jedna karta Players + Game log po prawej,
  tej samej wysokości co tabela. Węższe ekrany: 2 kolumny, telefon: 1.
- **Wpisywanie kości:** klik kości na suknie wybiera, którą zmieniamy; pod miską sześć samych
  kości (bez ramek) do wyboru wartości i przycisk „Save”. Bez nagłówków i napisów pomocniczych.
- **Komórki tabeli:** wpisany wynik / wolna (`–`) / podpowiedź dla aktywnego gracza (obwódka
  `primary`) / zero (`danger`) / sekcja dolna zablokowana (kreskowanie) / kolumna aktywnego
  gracza (`primary-soft`).
- **Architektura:** animacja kości zawsze kończy się na wartości już znanej (wpisanej przez
  hosta albo wylosowanej przez serwer). Bez silnika fizyki i bez `Math.random()` — rozrzut
  i obroty są stałe albo liczone z danych gry. Bez WebGL / przy `prefers-reduced-motion` —
  płaskie kości 2D, brak animacji.
