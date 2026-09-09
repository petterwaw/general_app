---
name: etap-postep
description: Update the progress notes for the current project stage (docs/etapy/etap-N.md) and its status row in docs/STAN.md after finishing a chunk of work.
allowed-tools: Bash(git status:*) Bash(git diff:*) Bash(git log:*)
---

Zaktualizuj dokumentację postępu po skończonym kawałku pracy:

1. Sprawdź `docs/STAN.md`, żeby ustalić, którego etapu to dotyczy, i przeczytaj jego plik
   `docs/etapy/etap-N.md`.
2. Ustal, co faktycznie powstało — na podstawie tej rozmowy oraz `git status`/`git diff`
   (staged + unstaged) i `git log`, jeśli praca jest już zacommitowana. Nie zgaduj i nie
   dopisuj niczego, czego nie widać w kodzie ani w rozmowie.
3. Dopisz notatkę postępu do `docs/etapy/etap-N.md`, w stylu już istniejących wpisów (patrz
   etap-2.md, etap-3.md): konkretne nazwy plików/klas/funkcji, podjęte decyzje z uzasadnieniem,
   jawnie wypisany dług, który zostaje. Nie usuwaj istniejącej treści — dopisujesz, ewentualnie
   aktualizujesz status "Postęp: ..." na górze, jeśli już tam jest.
4. Sprawdź kryterium „gotowe gdy" z tego samego pliku — jeśli jest spełnione, zaznacz to
   wprost (`Postęp: KRYTERIUM SPEŁNIONE.`); jeśli częściowo, zostaw `W TRAKCIE` z opisem, czego
   brakuje.
5. Zaktualizuj odpowiedni wiersz w tabeli statusów w `docs/STAN.md`.
6. Pokaż diff tych dwóch plików i zapytaj, czy treść się zgadza, zanim uznasz zadanie za
   skończone — to notatka merytoryczna o stanie projektu, właściciel musi ją zweryfikować.

Nie rób commita — to osobny krok (`/commit`).
