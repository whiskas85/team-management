-- Il modello si divide in due: la configurazione da una parte, i testi dall'altra.
--
-- Prima ogni frase portava con sé il proprio gruppo WhatsApp. Finché i modelli
-- erano due si notava appena; con trenta modi di fare gli auguri diventava
-- trenta volte la stessa scelta, e il giorno che la squadra apre una chat nuova
-- sarebbero trenta modifiche a mano per spostarli tutti.
--
-- Adesso il modello dice *quando* parlare e *dove* scrivere, una volta sola, e
-- dentro tiene quanti testi si vuole. La rotazione scende di un piano: gira sui
-- testi, non sui modelli.
--
-- I testi che c'erano si conservano, e conservano anche il loro id: è quello che
-- il registro degli invii ha scritto accanto a ogni messaggio partito, e
-- cambiarlo avrebbe voluto dire perdere il filo di cosa è stato mandato con
-- cosa. I modelli che differivano solo per il testo si fondono in uno.

-- ------------------------------------------------------------------ i testi

CREATE TABLE "TestoModello" (
    "id" TEXT NOT NULL,
    "modelloId" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "usatoIl" TIMESTAMP(3),
    "volte" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestoModello_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TestoModello_modelloId_attivo_idx" ON "TestoModello"("modelloId", "attivo");

-- Chi resta come contenitore: fra i modelli che dicono la stessa cosa nello
-- stesso posto, il più vecchio. Gli altri diventano suoi testi.
CREATE TEMP TABLE "_dove_va" AS
SELECT
  m."id" AS testo_id,
  (
    SELECT m2."id"
      FROM "ModelloMessaggio" m2
     WHERE m2."scatenante" = m."scatenante"
       AND m2."destinazione" = m."destinazione"
       AND COALESCE(m2."gruppoId", '') = COALESCE(m."gruppoId", '')
     ORDER BY m2."createdAt" ASC, m2."id" ASC
     LIMIT 1
  ) AS contenitore_id
FROM "ModelloMessaggio" m;

INSERT INTO "TestoModello" ("id", "modelloId", "testo", "attivo", "usatoIl", "volte", "createdAt")
SELECT m."id", d.contenitore_id, m."testo", m."attivo", m."usatoIl", m."volte", m."createdAt"
  FROM "ModelloMessaggio" m
  JOIN "_dove_va" d ON d.testo_id = m."id";

ALTER TABLE "TestoModello"
  ADD CONSTRAINT "TestoModello_modelloId_fkey"
  FOREIGN KEY ("modelloId") REFERENCES "ModelloMessaggio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------- il registro guarda i testi

-- Si sposta prima di cancellare i modelli fusi: la vecchia chiave azzerava il
-- riferimento invece di seguirlo, e il registro avrebbe dimenticato con quale
-- frase erano partiti i messaggi di quest'anno.
ALTER TABLE "MessaggioInviato" DROP CONSTRAINT IF EXISTS "MessaggioInviato_modelloId_fkey";
ALTER TABLE "MessaggioInviato" RENAME COLUMN "modelloId" TO "testoId";
ALTER TABLE "MessaggioInviato"
  ADD CONSTRAINT "MessaggioInviato_testoId_fkey"
  FOREIGN KEY ("testoId") REFERENCES "TestoModello"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- --------------------------------------------------------- i contenitori

DELETE FROM "ModelloMessaggio"
 WHERE "id" NOT IN (SELECT DISTINCT contenitore_id FROM "_dove_va");

ALTER TABLE "ModelloMessaggio" ADD COLUMN "titolo" TEXT;

-- Un nome leggibile, che è anche quello con cui un assistente ritrova il modello
-- per infilarci dentro testi nuovi. Numerato solo se ce n'è più d'uno per tipo.
UPDATE "ModelloMessaggio" m
   SET "titolo" = n.nome || CASE WHEN n.rn > 1 THEN ' ' || n.rn ELSE '' END
  FROM (
    SELECT "id",
           CASE "scatenante"
             WHEN 'COMPLEANNO'              THEN 'Auguri di compleanno'
             WHEN 'PROMEMORIA_ATTIVITA'     THEN 'Promemoria attività'
             WHEN 'QUOTA_APERTA'            THEN 'Quota da saldare'
             WHEN 'CERTIFICATO_IN_SCADENZA' THEN 'Certificato in scadenza'
             ELSE 'Messaggio libero'
           END AS nome,
           ROW_NUMBER() OVER (PARTITION BY "scatenante" ORDER BY "createdAt" ASC, "id" ASC) AS rn
      FROM "ModelloMessaggio"
  ) n
 WHERE n."id" = m."id";

ALTER TABLE "ModelloMessaggio" ALTER COLUMN "titolo" SET NOT NULL;
CREATE UNIQUE INDEX "ModelloMessaggio_titolo_key" ON "ModelloMessaggio"("titolo");

ALTER TABLE "ModelloMessaggio" DROP COLUMN "testo";
ALTER TABLE "ModelloMessaggio" DROP COLUMN "usatoIl";
ALTER TABLE "ModelloMessaggio" DROP COLUMN "volte";

DROP TABLE "_dove_va";
