-- Il collegamento fra gestionali di squadre diverse (docs/COLLEGAMENTO-SQUADRE.md):
-- chi siamo per gli altri, i link per farsi collegare, i collegamenti e la coda
-- di quello che si manda.

-- CreateEnum
CREATE TYPE "StatoCollegamento" AS ENUM ('RICHIESTO', 'DA_ACCETTARE', 'ATTIVO', 'RIFIUTATO', 'SCOLLEGATO');

-- AlterTable
ALTER TABLE "SquadraEsterna" ADD COLUMN     "logoPath" TEXT;

-- CreateTable
CREATE TABLE "IdentitaGestionale" (
    "id" TEXT NOT NULL DEFAULT 'io',
    "indirizzo" TEXT NOT NULL,
    "chiavePubblica" TEXT NOT NULL,
    "chiavePrivataCifrata" TEXT NOT NULL,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentitaGestionale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkCollegamento" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "creatoDaId" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scadeIl" TIMESTAMP(3) NOT NULL,
    "revocatoIl" TIMESTAMP(3),
    "usato" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LinkCollegamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollegamentoSquadra" (
    "id" TEXT NOT NULL,
    "indirizzo" TEXT NOT NULL,
    "chiavePubblica" TEXT NOT NULL,
    "stato" "StatoCollegamento" NOT NULL,
    "squadraId" TEXT,
    "profilo" JSONB NOT NULL,
    "logoVersione" TEXT,
    "richiestoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attivoDal" TIMESTAMP(3),
    "chiusoIl" TIMESTAMP(3),
    "decisoDa" TEXT,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegamentoSquadra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessaggioFederazione" (
    "id" TEXT NOT NULL,
    "collegamentoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "corpo" JSONB NOT NULL,
    "tentativi" INTEGER NOT NULL DEFAULT 0,
    "prossimoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoErrore" TEXT,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessaggioFederazione_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkCollegamento_token_key" ON "LinkCollegamento"("token");

-- CreateIndex
CREATE UNIQUE INDEX "CollegamentoSquadra_indirizzo_key" ON "CollegamentoSquadra"("indirizzo");

-- CreateIndex
CREATE UNIQUE INDEX "CollegamentoSquadra_squadraId_key" ON "CollegamentoSquadra"("squadraId");

-- CreateIndex
CREATE INDEX "CollegamentoSquadra_stato_idx" ON "CollegamentoSquadra"("stato");

-- CreateIndex
CREATE INDEX "MessaggioFederazione_prossimoIl_idx" ON "MessaggioFederazione"("prossimoIl");

-- CreateIndex
CREATE INDEX "MessaggioFederazione_collegamentoId_creatoIl_idx" ON "MessaggioFederazione"("collegamentoId", "creatoIl");

-- AddForeignKey
ALTER TABLE "LinkCollegamento" ADD CONSTRAINT "LinkCollegamento_creatoDaId_fkey" FOREIGN KEY ("creatoDaId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollegamentoSquadra" ADD CONSTRAINT "CollegamentoSquadra_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "SquadraEsterna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessaggioFederazione" ADD CONSTRAINT "MessaggioFederazione_collegamentoId_fkey" FOREIGN KEY ("collegamentoId") REFERENCES "CollegamentoSquadra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
