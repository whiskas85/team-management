-- Sondaggi: le decisioni si/no, il voto segreto, le proposte di chi risponde.

ALTER TYPE "TipoSondaggio" ADD VALUE 'DECISIONE';

ALTER TABLE "Sondaggio" ADD COLUMN "segreto" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Sondaggio" ADD COLUMN "proposteAperte" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "OpzioneSondaggio" ADD COLUMN "propostaDaId" TEXT;
ALTER TABLE "OpzioneSondaggio" ADD CONSTRAINT "OpzioneSondaggio_propostaDaId_fkey" FOREIGN KEY ("propostaDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
