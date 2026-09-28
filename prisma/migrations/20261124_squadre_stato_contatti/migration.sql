-- Squadre esterne: uno stato al posto di attiva/non attiva (le preferite in
-- cima), i dati che arrivano dal portale FIGT, e i contatti come persone con
-- un ruolo. Il vecchio «referente» diventa un contatto: non si perde nessuno.

CREATE TYPE "StatoSquadra" AS ENUM ('PREFERITA', 'ATTIVA', 'DISATTIVATA');

ALTER TABLE "SquadraEsterna"
  ADD COLUMN "stato" "StatoSquadra" NOT NULL DEFAULT 'ATTIVA',
  ADD COLUMN "nomeFigt" TEXT,
  ADD COLUMN "indirizzo" TEXT,
  ADD COLUMN "cap" TEXT,
  ADD COLUMN "disciplina" TEXT,
  ADD COLUMN "settoreGiovanile" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "figtAggiornataIl" TIMESTAMP(3);

UPDATE "SquadraEsterna" SET "stato" = 'DISATTIVATA' WHERE "attiva" = false;

CREATE TABLE "ContattoSquadra" (
    "id" TEXT NOT NULL,
    "squadraId" TEXT NOT NULL,
    "ruolo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "ordine" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContattoSquadra_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ContattoSquadra" ("id", "squadraId", "ruolo", "nome", "ordine")
SELECT 'ref_' || "id", "id", 'Referente', "referente", 0
FROM "SquadraEsterna"
WHERE "referente" IS NOT NULL AND btrim("referente") <> '';

DROP INDEX "SquadraEsterna_attiva_nome_idx";
ALTER TABLE "SquadraEsterna" DROP COLUMN "attiva", DROP COLUMN "referente";

CREATE INDEX "ContattoSquadra_squadraId_ordine_idx" ON "ContattoSquadra"("squadraId", "ordine");
CREATE UNIQUE INDEX "SquadraEsterna_nomeFigt_key" ON "SquadraEsterna"("nomeFigt");
CREATE INDEX "SquadraEsterna_stato_nome_idx" ON "SquadraEsterna"("stato", "nome");

ALTER TABLE "ContattoSquadra" ADD CONSTRAINT "ContattoSquadra_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "SquadraEsterna"("id") ON DELETE CASCADE ON UPDATE CASCADE;
