-- Più pagamenti fra squadre per la stessa attività, ognuno da confermare
CREATE TABLE "VersamentoSquadra" (
    "id" TEXT NOT NULL,
    "squadraOspiteId" TEXT,
    "eventId" TEXT,
    "idRemoto" TEXT,
    "importo" DECIMAL(10,2) NOT NULL,
    "metodo" TEXT,
    "note" TEXT,
    "segnalatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confermatoIl" TIMESTAMP(3),
    "confermatoDaId" TEXT,
    "movimentoCassaId" TEXT,
    CONSTRAINT "VersamentoSquadra_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VersamentoSquadra_squadraOspiteId_idRemoto_key" ON "VersamentoSquadra"("squadraOspiteId", "idRemoto");
CREATE INDEX "VersamentoSquadra_eventId_idx" ON "VersamentoSquadra"("eventId");
ALTER TABLE "VersamentoSquadra" ADD CONSTRAINT "VersamentoSquadra_squadraOspiteId_fkey" FOREIGN KEY ("squadraOspiteId") REFERENCES "SquadraOspite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VersamentoSquadra" ADD CONSTRAINT "VersamentoSquadra_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- il versamento unico di prima diventa il primo della lista, dai due lati:
-- l'id «precedente» è quello con cui i due gestionali lo riconoscono
INSERT INTO "VersamentoSquadra" ("id", "squadraOspiteId", "idRemoto", "importo", "metodo", "note", "segnalatoIl", "confermatoIl", "confermatoDaId", "movimentoCassaId")
SELECT 'prec-' || "id", "id", 'precedente', "versatoImporto", "versatoMetodo", "versatoNote", "versatoIl", "confermatoIl", "confermatoDaId", "movimentoCassaId"
FROM "SquadraOspite" WHERE "versatoIl" IS NOT NULL AND "versatoImporto" IS NOT NULL;
INSERT INTO "VersamentoSquadra" ("id", "eventId", "importo", "segnalatoIl", "confermatoIl")
SELECT 'precedente-' || "id", "id", "origineVersatoImporto", "origineVersatoIl", "origineVersatoConfermatoIl"
FROM "Event" WHERE "origineVersatoIl" IS NOT NULL AND "origineVersatoImporto" IS NOT NULL;

ALTER TABLE "SquadraOspite" DROP COLUMN "versatoIl", DROP COLUMN "versatoImporto", DROP COLUMN "versatoMetodo", DROP COLUMN "versatoNote", DROP COLUMN "confermatoIl", DROP COLUMN "confermatoDaId", DROP COLUMN "movimentoCassaId";
ALTER TABLE "Event" DROP COLUMN "origineVersatoIl", DROP COLUMN "origineVersatoImporto", DROP COLUMN "origineVersatoConfermatoIl";
