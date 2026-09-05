-- Stagioni come anagrafica, tariffario, quota fissa per i nuovi.

ALTER TYPE "StatoOperatore" ADD VALUE IF NOT EXISTS 'DA_RICONFERMARE';

CREATE TYPE "VoceTariffa" AS ENUM ('ISCRIZIONE', 'REISCRIZIONE', 'TESSERA_FIGT', 'GIOCATA_NUOVO', 'AFFITTO');

CREATE TABLE "Stagione" (
  "id"        TEXT NOT NULL,
  "nome"      TEXT NOT NULL,
  "inizio"    TIMESTAMP(3) NOT NULL,
  "fine"      TIMESTAMP(3) NOT NULL,
  "corrente"  BOOLEAN NOT NULL DEFAULT false,
  "chiusa"    BOOLEAN NOT NULL DEFAULT false,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Stagione_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Stagione_nome_key" ON "Stagione"("nome");
CREATE INDEX "Stagione_corrente_idx" ON "Stagione"("corrente");

CREATE TABLE "Tariffa" (
  "id"         TEXT NOT NULL,
  "voce"       "VoceTariffa" NOT NULL,
  "stagioneId" TEXT,
  "importo"    DECIMAL(10,2) NOT NULL,
  "note"       TEXT,
  "attiva"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tariffa_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Tariffa_voce_idx" ON "Tariffa"("voce");
ALTER TABLE "Tariffa" ADD CONSTRAINT "Tariffa_stagioneId_fkey"
  FOREIGN KEY ("stagioneId") REFERENCES "Stagione"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Una sola tariffa generica per voce, e una sola per voce+stagione.
-- Serve un indice parziale: in Postgres due NULL non si considerano uguali,
-- quindi un unique normale non impedirebbe due righe "senza stagione".
CREATE UNIQUE INDEX "Tariffa_voce_generica_key" ON "Tariffa"("voce") WHERE "stagioneId" IS NULL;
CREATE UNIQUE INDEX "Tariffa_voce_stagione_key" ON "Tariffa"("voce", "stagioneId") WHERE "stagioneId" IS NOT NULL;

ALTER TABLE "TipoAttivita" ADD COLUMN "quotaNuovi" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Event" ADD COLUMN "stagioneId" TEXT;
ALTER TABLE "Event" ADD CONSTRAINT "Event_stagioneId_fkey"
  FOREIGN KEY ("stagioneId") REFERENCES "Stagione"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Iscrizioni e tessere passano dalla stringa alla stagione vera.
-- Ogni valore gia' presente diventa una riga di Stagione, cosi' non si perde nulla.
INSERT INTO "Stagione" ("id", "nome", "inizio", "fine")
SELECT md5(random()::text || nome), nome,
       make_timestamp(split_part(nome, '/', 1)::int, 9, 1, 0, 0, 0),
       make_timestamp(split_part(nome, '/', 2)::int, 8, 31, 0, 0, 0)
FROM (
  SELECT DISTINCT "stagione" AS nome FROM "Membership"
  UNION
  SELECT DISTINCT "stagione" AS nome FROM "FigtCard"
) AS esistenti
WHERE nome ~ '^\d{4}/\d{4}$';

ALTER TABLE "Membership" ADD COLUMN "stagioneId" TEXT;
UPDATE "Membership" m SET "stagioneId" = s."id" FROM "Stagione" s WHERE s."nome" = m."stagione";
DELETE FROM "Membership" WHERE "stagioneId" IS NULL;
ALTER TABLE "Membership" ALTER COLUMN "stagioneId" SET NOT NULL;
DROP INDEX IF EXISTS "Membership_userId_stagione_key";
ALTER TABLE "Membership" DROP COLUMN "stagione";
CREATE UNIQUE INDEX "Membership_userId_stagioneId_key" ON "Membership"("userId", "stagioneId");
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_stagioneId_fkey"
  FOREIGN KEY ("stagioneId") REFERENCES "Stagione"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FigtCard" ADD COLUMN "stagioneId" TEXT;
UPDATE "FigtCard" f SET "stagioneId" = s."id" FROM "Stagione" s WHERE s."nome" = f."stagione";
DELETE FROM "FigtCard" WHERE "stagioneId" IS NULL;
ALTER TABLE "FigtCard" ALTER COLUMN "stagioneId" SET NOT NULL;
ALTER TABLE "FigtCard" DROP COLUMN "stagione";
ALTER TABLE "FigtCard" ADD CONSTRAINT "FigtCard_stagioneId_fkey"
  FOREIGN KEY ("stagioneId") REFERENCES "Stagione"("id") ON DELETE CASCADE ON UPDATE CASCADE;
