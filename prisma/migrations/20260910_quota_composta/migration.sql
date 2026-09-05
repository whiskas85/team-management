-- La quota di iscrizione puo nascere da piu voci di listino: se ne conserva la composizione.
ALTER TABLE "Membership" ADD COLUMN "dettaglioQuota" TEXT;
