-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "hostIdentityId" TEXT;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_hostIdentityId_fkey" FOREIGN KEY ("hostIdentityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: the host of existing games is the identity attached to their HOST participant.
UPDATE "Game" AS g
SET "hostIdentityId" = p."identityId"
FROM "Participant" AS p
WHERE p."gameId" = g."id" AND p."role" = 'HOST';

-- One active (LOBBY / IN_PROGRESS) game per host identity. Not expressible in schema.prisma.
CREATE UNIQUE INDEX "Game_hostIdentityId_active_key"
ON "Game" ("hostIdentityId")
WHERE "status" IN ('LOBBY', 'IN_PROGRESS');
