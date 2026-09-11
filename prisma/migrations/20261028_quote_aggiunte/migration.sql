-- Le quote aggiunte con il + nel modulo di un'attività: un nome, un importo e
-- la cassa a cui vanno, e valgono solo lì. Prendono il posto dell'importo
-- scritto a mano: quello che c'era — la quota del club, le quote delle altre
-- casse — diventa una quota aggiunta già spuntata, così riaprendo il modulo si
-- ritrova e salvando non sparisce. I totali già calcolati non cambiano.

-- CreateTable
CREATE TABLE "VoceAttivita" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "perEsterni" BOOLEAN NOT NULL,
    "nome" TEXT NOT NULL,
    "importo" DECIMAL(10,2) NOT NULL,
    "cassaId" TEXT,
    "scelta" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoceAttivita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoceAttivita_eventId_idx" ON "VoceAttivita"("eventId");

-- AddForeignKey
ALTER TABLE "VoceAttivita" ADD CONSTRAINT "VoceAttivita_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoceAttivita" ADD CONSTRAINT "VoceAttivita_cassaId_fkey" FOREIGN KEY ("cassaId") REFERENCES "Cassa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- La quota squadra del club scritta a mano (senza voci, era tutta a mano):
-- zero o niente vuol dire gratis, e non serve una riga per dirlo
INSERT INTO "VoceAttivita" ("id", "eventId", "perEsterni", "nome", "importo", "cassaId", "scelta")
SELECT 'va' || md5(e."id" || ':squadra'), e."id", false, 'Quota', m.v, NULL, true
FROM "Event" e
CROSS JOIN LATERAL (
  SELECT COALESCE(e."costoAMano", CASE WHEN cardinality(e."vociSquadra") = 0 THEN e."costo" END) AS v
) m
WHERE m.v > 0;

-- La quota esterni del club: zero è un'offerta, e va tenuto; niente vuol dire
-- «come la squadra», e resta niente
INSERT INTO "VoceAttivita" ("id", "eventId", "perEsterni", "nome", "importo", "cassaId", "scelta")
SELECT 'va' || md5(e."id" || ':esterni'), e."id", true,
       CASE WHEN m.v = 0 THEN 'Offerta' ELSE 'Quota esterni' END, m.v, NULL, true
FROM "Event" e
CROSS JOIN LATERAL (
  SELECT COALESCE(e."costoEsterniAMano", CASE WHEN cardinality(e."vociEsterni") = 0 THEN e."costoEsterni" END) AS v
) m
WHERE m.v IS NOT NULL;

-- Le quote delle altre casse, con il loro nome
INSERT INTO "VoceAttivita" ("id", "eventId", "perEsterni", "nome", "importo", "cassaId", "scelta")
SELECT 'va' || md5(q."id" || ':squadra'), q."eventId", false, q."descrizione", m.v, q."cassaId", true
FROM "QuotaCassa" q
CROSS JOIN LATERAL (
  SELECT COALESCE(q."importoAMano", CASE WHEN cardinality(q."voci") = 0 THEN q."importo" END) AS v
) m
WHERE m.v > 0;

INSERT INTO "VoceAttivita" ("id", "eventId", "perEsterni", "nome", "importo", "cassaId", "scelta")
SELECT 'va' || md5(q."id" || ':esterni'), q."eventId", true, q."descrizione", m.v, q."cassaId", true
FROM "QuotaCassa" q
CROSS JOIN LATERAL (
  SELECT COALESCE(q."importoEsterniAMano", CASE WHEN cardinality(q."vociEsterni") = 0 THEN q."importoEsterni" END) AS v
) m
WHERE m.v IS NOT NULL;

-- Le voci del tariffario spuntate nelle quote delle altre casse passano
-- all'attività, insieme a quelle del club
UPDATE "Event" e SET "vociSquadra" = e."vociSquadra" || s.v
FROM (
  SELECT q."eventId", array_agg(x) AS v
  FROM "QuotaCassa" q CROSS JOIN LATERAL unnest(q."voci") AS x
  GROUP BY q."eventId"
) s
WHERE s."eventId" = e."id";

UPDATE "Event" e SET "vociEsterni" = e."vociEsterni" || s.v
FROM (
  SELECT q."eventId", array_agg(x) AS v
  FROM "QuotaCassa" q CROSS JOIN LATERAL unnest(q."vociEsterni") AS x
  GROUP BY q."eventId"
) s
WHERE s."eventId" = e."id";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "costoAMano",
DROP COLUMN "costoEsterniAMano";

-- AlterTable
ALTER TABLE "QuotaCassa" DROP COLUMN "importoAMano",
DROP COLUMN "importoEsterniAMano",
DROP COLUMN "voci",
DROP COLUMN "vociEsterni";
