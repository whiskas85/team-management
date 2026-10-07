-- La prima configurazione guidata dell'admin e il giro guidato di tutti gli altri.
ALTER TABLE "MiaSquadra" ADD COLUMN "configurataIl" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "giroVistoIl" TIMESTAMP(3);

-- Un gestionale che ha già qualcuno dentro è già configurato: la procedura
-- guidata è per quelli appena nati (database vuoto, il seed viene dopo).
INSERT INTO "MiaSquadra" ("id", "configurataIl", "aggiornatoIl")
SELECT 'mia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "User")
ON CONFLICT ("id") DO UPDATE SET "configurataIl" = CURRENT_TIMESTAMP;

-- Chi il gestionale lo usa già non ha bisogno del giro all'improvviso: lo
-- trova nel chip col suo nome. Parte da solo per chi non è mai entrato.
UPDATE "User" SET "giroVistoIl" = CURRENT_TIMESTAMP WHERE "ultimaAttivita" IS NOT NULL OR "ultimoAccesso" IS NOT NULL;

-- Le affiliazioni FIGT lette dal portale: il codice giusto si ricava dalle date.
CREATE TABLE "AffiliazioneFigt" (
    "codice" TEXT NOT NULL,
    "richiestaIl" TIMESTAMP(3),
    "ragioneSociale" TEXT,
    "tipo" TEXT,
    "validaDa" TIMESTAMP(3),
    "validaA" TIMESTAMP(3),
    "anno" INTEGER,
    "stato" TEXT NOT NULL,
    "tesserati" INTEGER,
    "limite" INTEGER,
    "codiceAcsi" TEXT,
    "lettaIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliazioneFigt_pkey" PRIMARY KEY ("codice")
);
