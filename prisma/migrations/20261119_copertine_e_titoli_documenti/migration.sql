-- La copertina dei sondaggi, e titolo e descrizione dei documenti di bacheca.

ALTER TABLE "Sondaggio" ADD COLUMN "copertinaPath" TEXT;
ALTER TABLE "Sondaggio" ADD COLUMN "copertinaTipo" TEXT;
ALTER TABLE "Sondaggio" ADD COLUMN "copertinaTitolo" TEXT;

ALTER TABLE "AllegatoBacheca" ADD COLUMN "titolo" TEXT;
ALTER TABLE "AllegatoBacheca" ADD COLUMN "descrizione" TEXT;
