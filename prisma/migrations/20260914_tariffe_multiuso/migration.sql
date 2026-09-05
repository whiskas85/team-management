-- Un automatismo puo' essere composto da piu' voci (lo spaccato della quota),
-- e la stessa voce puo' servire a piu' automatismi: "uso" singolo diventa
-- "usi", un insieme, e cadono i vincoli di unicita' che lo impedivano.
DROP INDEX IF EXISTS "Tariffa_uso_generico_key";
DROP INDEX IF EXISTS "Tariffa_uso_stagione_key";
DROP INDEX IF EXISTS "Tariffa_uso_idx";

ALTER TABLE "Tariffa" ADD COLUMN "usi" "VoceTariffa"[] NOT NULL DEFAULT ARRAY[]::"VoceTariffa"[];
UPDATE "Tariffa" SET "usi" = ARRAY["uso"] WHERE "uso" IS NOT NULL;
ALTER TABLE "Tariffa" DROP COLUMN "uso";

CREATE INDEX "Tariffa_nome_idx" ON "Tariffa"("nome");
