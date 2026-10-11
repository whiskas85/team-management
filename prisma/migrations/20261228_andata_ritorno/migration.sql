-- Andata e ritorno o sola andata. I chilometri calcolati diventano di sola
-- andata: si azzera la firma, così si ricalcolano alla prima apertura.
ALTER TABLE "Macchina" ADD COLUMN "andataRitorno" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Macchina" SET "kmFirma" = NULL, "kmCalcolati" = NULL, "kmAutostrada" = NULL;
-- i km scritti a mano erano di andata e ritorno: ora sono di sola andata
UPDATE "Macchina" SET "km" = ROUND("km" / 2.0) WHERE "km" IS NOT NULL;
