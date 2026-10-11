-- Chi chiede un passaggio da sé, e i chilometri calcolati dal percorso.
ALTER TYPE "StatoPasseggero" ADD VALUE 'RICHIESTO';
ALTER TABLE "Macchina" ADD COLUMN "kmCalcolati" INTEGER;
ALTER TABLE "Macchina" ADD COLUMN "kmFirma" TEXT;
ALTER TABLE "Macchina" ADD COLUMN "kmStimati" BOOLEAN NOT NULL DEFAULT false;
