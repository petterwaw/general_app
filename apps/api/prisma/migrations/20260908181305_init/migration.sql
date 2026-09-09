-- CreateEnum
CREATE TYPE "StatusGry" AS ENUM ('LOBBY', 'TRWA', 'ZAKONCZONA', 'PORZUCONA', 'WYGASLA');

-- CreateTable
CREATE TABLE "Gra" (
    "id" TEXT NOT NULL,
    "status" "StatusGry" NOT NULL DEFAULT 'LOBBY',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "ostatniaAktywnosc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataUtworzenia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualnyGraczId" TEXT,

    CONSTRAINT "Gra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Uczestnik" (
    "id" TEXT NOT NULL,
    "imie" TEXT NOT NULL,
    "kartaWynikow" JSONB NOT NULL,
    "kolejnosc" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "Uczestnik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogZdarzen" (
    "id" TEXT NOT NULL,
    "typAkcji" TEXT NOT NULL,
    "dane" JSONB NOT NULL,
    "revisionPo" INTEGER NOT NULL,
    "kluczIdempotencji" TEXT NOT NULL,
    "dataUtworzenia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "LogZdarzen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gra_aktualnyGraczId_key" ON "Gra"("aktualnyGraczId");

-- CreateIndex
CREATE UNIQUE INDEX "LogZdarzen_gameId_kluczIdempotencji_key" ON "LogZdarzen"("gameId", "kluczIdempotencji");

-- AddForeignKey
ALTER TABLE "Gra" ADD CONSTRAINT "Gra_aktualnyGraczId_fkey" FOREIGN KEY ("aktualnyGraczId") REFERENCES "Uczestnik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Uczestnik" ADD CONSTRAINT "Uczestnik_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Gra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogZdarzen" ADD CONSTRAINT "LogZdarzen_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Gra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
