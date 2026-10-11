-- Le macchinate: chi mette la macchina per un'attività, chi carica e dove, e
-- quello che si è speso in viaggio per fare i conti di chi deve a chi.

-- CreateEnum
CREATE TYPE "ModoMacchina" AS ENUM ('PRENDO', 'RITROVO');

-- CreateEnum
CREATE TYPE "StatoPasseggero" AS ENUM ('INVITATO', 'ACCETTATO', 'RIFIUTATO');

-- CreateEnum
CREATE TYPE "TipoSpesaViaggio" AS ENUM ('CARBURANTE', 'CASELLO', 'ALTRO');

-- CreateTable
CREATE TABLE "Macchina" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "autistaId" TEXT NOT NULL,
    "modo" "ModoMacchina" NOT NULL DEFAULT 'RITROVO',
    "posti" INTEGER,
    "partenza" TEXT,
    "partenzaLat" DOUBLE PRECISION,
    "partenzaLng" DOUBLE PRECISION,
    "partenzaOra" TIMESTAMP(3),
    "arrivo" TEXT,
    "arrivoLat" DOUBLE PRECISION,
    "arrivoLng" DOUBLE PRECISION,
    "arrivoOra" TIMESTAMP(3),
    "note" TEXT,
    "km" INTEGER,
    "consumo" DOUBLE PRECISION,
    "prezzoLitro" DECIMAL(6,3),
    "caselli" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Macchina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TappaMacchina" (
    "id" TEXT NOT NULL,
    "macchinaId" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "luogo" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "ora" TIMESTAMP(3),

    CONSTRAINT "TappaMacchina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasseggeroMacchina" (
    "id" TEXT NOT NULL,
    "macchinaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stato" "StatoPasseggero" NOT NULL DEFAULT 'INVITATO',
    "tappaId" TEXT,
    "invitatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rispostoIl" TIMESTAMP(3),

    CONSTRAINT "PasseggeroMacchina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpesaViaggio" (
    "id" TEXT NOT NULL,
    "macchinaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoSpesaViaggio" NOT NULL,
    "importo" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpesaViaggio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Macchina_eventId_autistaId_key" ON "Macchina"("eventId", "autistaId");

-- CreateIndex
CREATE INDEX "TappaMacchina_macchinaId_idx" ON "TappaMacchina"("macchinaId");

-- CreateIndex
CREATE INDEX "PasseggeroMacchina_userId_idx" ON "PasseggeroMacchina"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasseggeroMacchina_macchinaId_userId_key" ON "PasseggeroMacchina"("macchinaId", "userId");

-- CreateIndex
CREATE INDEX "SpesaViaggio_macchinaId_idx" ON "SpesaViaggio"("macchinaId");

-- AddForeignKey
ALTER TABLE "Macchina" ADD CONSTRAINT "Macchina_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Macchina" ADD CONSTRAINT "Macchina_autistaId_fkey" FOREIGN KEY ("autistaId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TappaMacchina" ADD CONSTRAINT "TappaMacchina_macchinaId_fkey" FOREIGN KEY ("macchinaId") REFERENCES "Macchina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasseggeroMacchina" ADD CONSTRAINT "PasseggeroMacchina_macchinaId_fkey" FOREIGN KEY ("macchinaId") REFERENCES "Macchina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasseggeroMacchina" ADD CONSTRAINT "PasseggeroMacchina_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasseggeroMacchina" ADD CONSTRAINT "PasseggeroMacchina_tappaId_fkey" FOREIGN KEY ("tappaId") REFERENCES "TappaMacchina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpesaViaggio" ADD CONSTRAINT "SpesaViaggio_macchinaId_fkey" FOREIGN KEY ("macchinaId") REFERENCES "Macchina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpesaViaggio" ADD CONSTRAINT "SpesaViaggio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

