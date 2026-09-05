-- Il nome della tariffa diventa libero: in una stagione possono convivere
-- "Reiscrizione" e "Cassa comune". L'ex "voce" resta come aggancio facoltativo
-- agli automatismi e si chiama "uso".
DROP INDEX IF EXISTS "Tariffa_voce_generica_key";
DROP INDEX IF EXISTS "Tariffa_voce_stagione_key";
DROP INDEX IF EXISTS "Tariffa_voce_idx";

ALTER TABLE "Tariffa" RENAME COLUMN "voce" TO "uso";
ALTER TABLE "Tariffa" ALTER COLUMN "uso" DROP NOT NULL;
ALTER TABLE "Tariffa" ADD COLUMN "nome" TEXT NOT NULL DEFAULT '';
UPDATE "Tariffa" SET "nome" = initcap(replace("uso"::text, '_', ' ')) WHERE "nome" = '';
ALTER TABLE "Tariffa" ALTER COLUMN "nome" DROP DEFAULT;

CREATE INDEX "Tariffa_uso_idx" ON "Tariffa"("uso");

-- Un solo automatismo per uso: uno generico e uno per stagione.
CREATE UNIQUE INDEX "Tariffa_uso_generico_key" ON "Tariffa"("uso")
  WHERE "stagioneId" IS NULL AND "uso" IS NOT NULL;
CREATE UNIQUE INDEX "Tariffa_uso_stagione_key" ON "Tariffa"("uso", "stagioneId")
  WHERE "stagioneId" IS NOT NULL AND "uso" IS NOT NULL;

-- Nomi distinti dentro lo stesso ambito, per non ritrovarsi due righe identiche.
CREATE UNIQUE INDEX "Tariffa_nome_generico_key" ON "Tariffa"("nome") WHERE "stagioneId" IS NULL;
CREATE UNIQUE INDEX "Tariffa_nome_stagione_key" ON "Tariffa"("nome", "stagioneId")
  WHERE "stagioneId" IS NOT NULL;
