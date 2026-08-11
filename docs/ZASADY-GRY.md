# Zasady gry

> **STATUS: NIEWYPEŁNIONE.** To jest szkielet do uzupełnienia w etapie 0 przez właściciela
> projektu. Dopóki tabela punktacji nie jest wypełniona, **nie zaczynaj pisać silnika gry**
> (`packages/game-core`) — zapytaj o brakujące wartości.
>
> Claude: nie wypełniaj tego pliku wartościami z własnej wiedzy o Yatzy. Warianty różnią się
> między sobą i wybór należy do właściciela projektu.

---

## Wariant

Z opisu właściciela wynika, że chodzi o **Yatzy** (wariant skandynawski, w Polsce znany jako
„Kości" albo „Generał") — 5 kości, do 3 rzutów na turę, kategoria „dwie pary" obecna.

To **nie jest** amerykański Yahtzee, który nie ma kategorii „dwie pary".

Dokładny wariant: **DO USTALENIA**

---

## Parametry podstawowe

| Parametr | Wartość |
|---|---|
| Liczba kości | 5 |
| Rzutów na turę | 3 (pierwszy obowiązkowy, kolejne opcjonalne) |
| Liczba kategorii | 15 (do potwierdzenia) |
| Liczba rund | tyle, ile kategorii |

---

## Kategorie

Wstępny podział do potwierdzenia — **6 kategorii w sekcji górnej + 9 w sekcji dolnej = 15**.
To zgadza się z progiem 10/15 przyjętym w `DECYZJE.md` (67%).

### Sekcja górna

| Kategoria | Warunek | Punkty |
|---|---|---|
| Jedynki | | DO USTALENIA |
| Dwójki | | DO USTALENIA |
| Trójki | | DO USTALENIA |
| Czwórki | | DO USTALENIA |
| Piątki | | DO USTALENIA |
| Szóstki | | DO USTALENIA |

**Bonus sekcji górnej:** próg — DO USTALENIA, wartość — DO USTALENIA

### Sekcja dolna

| Kategoria | Warunek | Punkty |
|---|---|---|
| Para | | DO USTALENIA |
| Dwie pary | | DO USTALENIA |
| Trójka | | DO USTALENIA |
| Kareta | | DO USTALENIA |
| Mały strit | DO USTALENIA (1-2-3-4-5 czy 2-3-4-5-6?) | DO USTALENIA |
| Duży strit | DO USTALENIA | DO USTALENIA |
| Full | | DO USTALENIA |
| Szansa | | DO USTALENIA |
| Yatzy (5 jednakowych) | | DO USTALENIA |

---

## Pozostałe reguły

- **Gdy żadna kategoria nie pasuje:** gracz musi wpisać zero w wybraną wolną kategorię.
  Doprecyzowanie — DO USTALENIA.
- **Rozstrzyganie remisu:** DO USTALENIA.
- **Czy kategoria raz zapisana jest zablokowana:** DO USTALENIA (domyślnie tak).
- **Czy yatzy można zapisać wielokrotnie / czy jest premia za drugiego yatzy:** DO USTALENIA.

---

## Uwaga dla implementacji

Te zasady mają zostać zaimplementowane w `packages/game-core` jako czysty TypeScript bez
żadnego I/O — bez bazy, bez HTTP, bez zależności. To jedyna paczka w projekcie, która ma mieć
pokrycie testami bliskie 100%. Cała reszta systemu zakłada, że jest poprawna.
