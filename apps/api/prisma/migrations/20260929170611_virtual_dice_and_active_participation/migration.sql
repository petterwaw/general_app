-- CreateEnum
CREATE TYPE "DiceSource" AS ENUM ('PHYSICAL', 'VIRTUAL');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "diceSource" "DiceSource" NOT NULL DEFAULT 'PHYSICAL',
ADD COLUMN     "heldInLastRoll" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "rollNumber" INTEGER;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: participations in games that are already over no longer hold the device's slot.
UPDATE "Participant" AS p
SET "active" = false
FROM "Game" AS g
WHERE p."gameId" = g."id" AND g."status" NOT IN ('LOBBY', 'IN_PROGRESS');

-- One active game per device, local or online, as host or player. Replaces the index that only
-- covered hosts. Not expressible in schema.prisma.
DROP INDEX "Game_hostIdentityId_active_key";

CREATE UNIQUE INDEX "Participant_identityId_active_key"
ON "Participant" ("identityId")
WHERE "active";
