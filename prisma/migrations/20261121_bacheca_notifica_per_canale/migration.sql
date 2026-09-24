-- La notifica push si decide per bacheca, non per messaggio.
ALTER TABLE "Bacheca" ADD COLUMN "conNotifica" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MessaggioBacheca" DROP COLUMN "conNotifica";
