---
name: commit
description: Stage and commit the current changes following this repo's conventions (English message, imperative mood, no Claude attribution footer).
allowed-tools: Bash(git status:*) Bash(git diff:*) Bash(git log:*) Bash(git add:*) Bash(git commit:*)
---

Zrób commit bieżących zmian w tym repo:

1. Uruchom równolegle: `git status`, `git diff` (staged + unstaged), `git log --oneline -10`
   (styl komunikatów w tym repo).
2. Napisz zwięzłą wiadomość **po angielsku**, w trybie rozkazującym, skupioną na "dlaczego",
   nie na wyliczaniu zmienionych plików. Nie dopisuj `feat:`/`fix:` ani innych prefixów, jeśli
   dotychczasowa historia ich nie używa.
3. Dodaj do stage'a **konkretne pliki po nazwie** — nigdy `git add -A` ani `git add .`. Zanim
   dodasz, upewnij się, że nie ma wśród nich plików, które nie powinny wejść (sekrety,
   wygenerowane artefakty, niezwiązane zmiany robocze).
4. Jeśli ten commit domyka etap (sprawdź `docs/STAN.md` i kryterium „gotowe gdy" w
   `docs/etapy/etap-N.md`) — **zanim zrobisz commit** przypomnij, żeby dopisać notatkę postępu
   do pliku tego etapu. Nie dopisuj jej sam bez pytania — to decyzja właściciela, co dokładnie
   tam wejdzie.
5. Stwórz commit (`git commit`) z wiadomością przekazaną przez HEREDOC. Bez żadnej stopki
   atrybucji Claude'a — `.claude/settings.json` (`attribution.commit: ""`,
   `attribution.sessionUrl: false`) to wyłącza na poziomie repo, nie dopisuj jej ręcznie.
6. Po commicie uruchom `git status`, żeby potwierdzić czysty stan drzewa.

Nigdy nie pushuj, nie amenduj istniejących commitów i nie pomijaj hooków (`--no-verify`) bez
wyraźnej prośby.
