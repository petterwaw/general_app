# Etap 10 — Utwardzanie

Rate limity, Sentry, kasowanie porzuconych gier, PWA.

## Do sprawdzenia przed wdrożeniem na produkcję

- **`FRONTEND_URL` na produkcji** — lista originów CORS (po przecinku). Na produkcji ma w niej
  być wyłącznie prawdziwy adres frontu: bez `localhost` i bez IP z sieci domowej, które
  dopisuje się lokalnie do testów z telefonu.
- **`NEXT_PUBLIC_API_URL` na produkcji** — prawdziwy adres API. Podmiana hosta na host strony
  w `apps/web/src/app/api/client.ts` (`resolveApiUrl`) działa tylko, gdy w env jest
  `localhost` — sprawdzić, że produkcyjna wartość jej nie uruchamia.
- **`allowedDevOrigins` w `apps/web/next.config.ts`** — dotyczy tylko `next dev`, na produkcji
  nie działa; do usunięcia, jeśli testy po IP nie będą już potrzebne.
