# Zasady gry

> **STATUS: WYPEŁNIONE.** Zasady ustalone z właścicielem projektu w rozmowie z Claude. Etap 0
> zamknięty — można zaczynać pisanie silnika gry (`packages/game-core`).

---

## Wariant

Z opisu właściciela wynika, że chodzi o **Yatzy** (wariant skandynawski, w Polsce znany jako
„Kości" albo „Generał") — 5 kości, do 3 rzutów na turę, kategoria „dwie pary" obecna.

To **nie jest** amerykański Yahtzee, który nie ma kategorii „dwie pary".

---

## Parametry podstawowe

| Parametr | Wartość |
|---|---|
| Liczba kości | 5 |
| Rzutów na turę | 3 (pierwszy obowiązkowy, kolejne opcjonalne) |
| Liczba kategorii | 15 |
| Liczba rund | tyle, ile kategorii |

---

## Kategorie

Podział: **6 kategorii w sekcji górnej + 9 w sekcji dolnej = 15**. To zgadza się z progiem
10/15 przyjętym w `DECYZJE.md` (67%).

### Sekcja górna

| Kategoria | Warunek | Punkty |
|---|---|---|
| Jedynki | | punktow tyle co na liczacej sie kosci |
| Dwójki | | punktow tyle co na liczacej sie kosci |
| Trójki | | punktow tyle co na liczacej sie kosci |
| Czwórki | | punktow tyle co na liczacej sie kosci |
| Piątki | | punktow tyle co na liczacej sie kosci |
| Szóstki | | punktow tyle co na liczacej sie kosci |

Żeby wpisać realny wynik w kategorii górnej sekcji, potrzeba minimum 3 kości o danej wartości
(np. 3x6 daje 18 pkt). Może wypaść nawet 5 takich kości — wtedy liczymy 5x6, czyli 30 pkt.

Sekcja dolna odblokowuje się do **aktywnego** uzupełniania dopiero, gdy wypełnione są 3
kategorie w sekcji górnej (obojętnie, realnym wynikiem czy zerem). Jeśli w danej turze gracz
nie osiąga progu 3 sztuk w żadnej kategorii górnej, a sekcja dolna nie jest jeszcze
odblokowana, to mimo blokady **musi** wpisać zero w wybraną kategorię w sekcji dolnej —
blokada dotyczy tylko aktywnego, korzystnego wpisywania wyniku, nie wymuszonego zera.

**Wyjątek — Szansa.** Kategoria „Szansa" **nie podlega blokadzie sekcji dolnej**. Można ją
wpisać zawsze, gdy jest wolna, niezależnie od tego, ile kategorii górnych jest wypełnionych.

Szansa nie liczy się także przy ustalaniu, czy gracz jest zmuszony wpisać zero: to, że Szansa
jest jeszcze wolna i punktowałaby, **nie znosi** wymuszonego zera w innej kategorii. Wymuszone
zero sprawdzamy wyłącznie wśród pozostałych 14 kategorii (górnych zawsze, dolnych tylko gdy
sekcja dolna jest odblokowana).

**Bonus sekcji górnej:** próg — 63, wartość — 35

### Sekcja dolna

| Kategoria | Warunek | Punkty |
|---|---|---|
| Para | | tyle ile na kosciach tworzacych pare |
| Dwie pary | | tyle ile na kosciach tworzacych dwie pary |
| Trójka | | tyle ile na kosciach wszystkich |
| Kareta | | tyle ile na kosciach wszystkich |

Jeśli w rzucie pasuje więcej niż jedna wartość do danej kategorii (np. dwie różne pary przy
kategorii „Para", albo kareta/general przy kategorii „Trójka") — liczy się zawsze **najwyższa**
pasująca wartość.

**Dwie pary z tej samej wartości** (ustalone 2026-09-25). Kareta i generał liczą się jako dwie
pary — cztery kości tej samej wartości to dwie pary, np. 1‑1‑1‑1‑1 daje 4 pkt, 5‑5‑5‑5‑2 daje
20 pkt. Z trójki liczą się tylko dwie kości, np. 2‑2‑2‑4‑4 daje 12 pkt (2+2+4+4). O wyborze
kategorii decyduje gracz — ta reguła mówi tylko, ile punktów daje wybrana kategoria.
| Mały strit |  (4 wartosci pod rzad nie wazne jakie) | 25 |
| Duży strit | 5 wartosci pod rzad nie wazne jakie | 40 |
| Full | trójka + para (dwie różne wartości) **albo** generał (5 jednakowych) | 25 |
| Szansa | | tyle ile na kosciach |
| General (5 jednakowych) | | 50 |

---

## Pozostałe reguły

- **Gdy żadna kategoria nie pasuje:** gracz musi wpisać zero w wybraną wolną kategorię.
- **Rozstrzyganie remisu:** dwie osoby jako wygrane 
- **Czy kategoria raz zapisana jest zablokowana:** tak
- **Czy yatzy można zapisać wielokrotnie / czy jest premia za drugiego yatzy:** nie ma

---

## Uwaga dla implementacji

Te zasady mają zostać zaimplementowane w `packages/game-core` jako czysty TypeScript bez
żadnego I/O — bez bazy, bez HTTP, bez zależności. To jedyna paczka w projekcie, która ma mieć
pokrycie testami bliskie 100%. Cała reszta systemu zakłada, że jest poprawna.
