-- Squadre esterne e collegamento opzionale dal campo.
-- Migrazione additiva: nessuna colonna esistente viene toccata.

-- AlterTable
ALTER TABLE "Field" ADD COLUMN     "squadraId" TEXT;

-- CreateTable
CREATE TABLE "SquadraEsterna" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "referente" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "sito" TEXT,
    "citta" TEXT,
    "provincia" TEXT,
    "note" TEXT,
    "attiva" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SquadraEsterna_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SquadraEsterna_nome_key" ON "SquadraEsterna"("nome");

-- CreateIndex
CREATE INDEX "SquadraEsterna_attiva_nome_idx" ON "SquadraEsterna"("attiva", "nome");

-- CreateIndex
CREATE INDEX "Field_squadraId_idx" ON "Field"("squadraId");

-- AddForeignKey
ALTER TABLE "Field" ADD CONSTRAINT "Field_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "SquadraEsterna"("id") ON DELETE SET NULL ON UPDATE CASCADE;
