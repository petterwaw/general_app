-- Preserve existing data while renaming the database vocabulary to English.
ALTER TYPE "StatusGry" RENAME TO "GameStatus";
ALTER TYPE "GameStatus" RENAME VALUE 'TRWA' TO 'IN_PROGRESS';
ALTER TYPE "GameStatus" RENAME VALUE 'ZAKONCZONA' TO 'COMPLETED';
ALTER TYPE "GameStatus" RENAME VALUE 'PORZUCONA' TO 'ABANDONED';
ALTER TYPE "GameStatus" RENAME VALUE 'WYGASLA' TO 'EXPIRED';

CREATE TYPE "ParticipantRole" AS ENUM ('HOST', 'PLAYER', 'OBSERVER');

ALTER TABLE "Gra" RENAME TO "Game";
ALTER TABLE "Uczestnik" RENAME TO "Participant";
ALTER TABLE "LogZdarzen" RENAME TO "EventLog";

ALTER TABLE "Game" RENAME COLUMN "aktualnyGraczId" TO "currentPlayerId";
ALTER TABLE "Game" RENAME COLUMN "aktualneKosci" TO "currentDice";
ALTER TABLE "Game" RENAME COLUMN "ostatniaAktywnosc" TO "lastActivity";
ALTER TABLE "Game" RENAME COLUMN "dataUtworzenia" TO "createdAt";
ALTER TABLE "Game" ADD COLUMN "creationKey" TEXT;

ALTER TABLE "Participant" RENAME COLUMN "imie" TO "name";
ALTER TABLE "Participant" RENAME COLUMN "kartaWynikow" TO "scoreCard";
ALTER TABLE "Participant" RENAME COLUMN "kolejnosc" TO "turnOrder";
ALTER TABLE "Participant" ADD COLUMN "role" "ParticipantRole" NOT NULL DEFAULT 'PLAYER';
ALTER TABLE "Participant" ADD COLUMN "userId" TEXT;

ALTER TABLE "EventLog" RENAME COLUMN "typAkcji" TO "actionType";
ALTER TABLE "EventLog" RENAME COLUMN "dane" TO "payload";
ALTER TABLE "EventLog" RENAME COLUMN "revisionPo" TO "revisionAfter";
ALTER TABLE "EventLog" RENAME COLUMN "kluczIdempotencji" TO "idempotencyKey";
ALTER TABLE "EventLog" RENAME COLUMN "dataUtworzenia" TO "createdAt";

ALTER INDEX "Gra_aktualnyGraczId_key" RENAME TO "Game_currentPlayerId_key";
ALTER INDEX "LogZdarzen_gameId_kluczIdempotencji_key" RENAME TO "EventLog_gameId_idempotencyKey_key";
CREATE UNIQUE INDEX "Game_creationKey_key" ON "Game"("creationKey");
CREATE INDEX "Participant_userId_idx" ON "Participant"("userId");
CREATE INDEX "Participant_gameId_turnOrder_idx" ON "Participant"("gameId", "turnOrder");
