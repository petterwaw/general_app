-- AlterTable
ALTER TABLE "EventLog" RENAME CONSTRAINT "LogZdarzen_pkey" TO "EventLog_pkey";

-- AlterTable
ALTER TABLE "Game" RENAME CONSTRAINT "Gra_pkey" TO "Game_pkey";

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "identityId" TEXT;
ALTER TABLE "Participant" RENAME CONSTRAINT "Uczestnik_pkey" TO "Participant_pkey";

-- CreateTable
CREATE TABLE "Identity" (
    "id" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Participant_identityId_idx" ON "Participant"("identityId");

-- RenameForeignKey
ALTER TABLE "EventLog" RENAME CONSTRAINT "LogZdarzen_gameId_fkey" TO "EventLog_gameId_fkey";

-- RenameForeignKey
ALTER TABLE "Game" RENAME CONSTRAINT "Gra_aktualnyGraczId_fkey" TO "Game_currentPlayerId_fkey";

-- RenameForeignKey
ALTER TABLE "Participant" RENAME CONSTRAINT "Uczestnik_gameId_fkey" TO "Participant_gameId_fkey";

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
