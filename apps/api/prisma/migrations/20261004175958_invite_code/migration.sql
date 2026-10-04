-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "inviteCode" TEXT;

-- A code belongs to one active game; once the game is over the code is free again. Not
-- expressible in schema.prisma.
CREATE UNIQUE INDEX "Game_inviteCode_active_key"
ON "Game" ("inviteCode")
WHERE "status" IN ('LOBBY', 'IN_PROGRESS');
