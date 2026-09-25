-- CreateEnum
CREATE TYPE "FirmaSegnalazione" AS ENUM ('NOMINALE', 'ANONIMA', 'A_SCELTA');

-- CreateEnum
CREATE TYPE "StatoSegnalazioneCanale" AS ENUM ('APERTA', 'LETTA', 'RISPOSTA', 'CHIUSA');

-- AlterTable
ALTER TABLE "Sondaggio" ADD COLUMN     "segnalazioneId" TEXT;

-- CreateTable
CREATE TABLE "CanaleSegnalazioni" (
    "id" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "descrizione" TEXT,
    "icona" TEXT NOT NULL DEFAULT 'scudo',
    "firma" "FirmaSegnalazione" NOT NULL DEFAULT 'A_SCELTA',
    "pubblico" "DestinatariSondaggio" NOT NULL DEFAULT 'TUTTI',
    "conAllegati" BOOLEAN NOT NULL DEFAULT false,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creatoDaId" TEXT NOT NULL,

    CONSTRAINT "CanaleSegnalazioni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegnalazioneCanale" (
    "id" TEXT NOT NULL,
    "canaleId" TEXT NOT NULL,
    "autoreId" TEXT NOT NULL,
    "anonima" BOOLEAN NOT NULL DEFAULT false,
    "titolo" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "stato" "StatoSegnalazioneCanale" NOT NULL DEFAULT 'APERTA',
    "nuovaPerGestori" BOOLEAN NOT NULL DEFAULT true,
    "nuovaPerAutore" BOOLEAN NOT NULL DEFAULT false,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lettaIl" TIMESTAMP(3),
    "chiusaIl" TIMESTAMP(3),

    CONSTRAINT "SegnalazioneCanale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RispostaSegnalazione" (
    "id" TEXT NOT NULL,
    "segnalazioneId" TEXT NOT NULL,
    "autoreId" TEXT NOT NULL,
    "daGestore" BOOLEAN NOT NULL,
    "testo" TEXT NOT NULL,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RispostaSegnalazione_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllegatoSegnalazione" (
    "id" TEXT NOT NULL,
    "segnalazioneId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllegatoSegnalazione_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SegnalazioneCanale_autoreId_idx" ON "SegnalazioneCanale"("autoreId");

-- CreateIndex
CREATE INDEX "SegnalazioneCanale_canaleId_stato_idx" ON "SegnalazioneCanale"("canaleId", "stato");

-- CreateIndex
CREATE INDEX "RispostaSegnalazione_segnalazioneId_creataIl_idx" ON "RispostaSegnalazione"("segnalazioneId", "creataIl");

-- AddForeignKey
ALTER TABLE "Sondaggio" ADD CONSTRAINT "Sondaggio_segnalazioneId_fkey" FOREIGN KEY ("segnalazioneId") REFERENCES "SegnalazioneCanale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanaleSegnalazioni" ADD CONSTRAINT "CanaleSegnalazioni_creatoDaId_fkey" FOREIGN KEY ("creatoDaId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegnalazioneCanale" ADD CONSTRAINT "SegnalazioneCanale_canaleId_fkey" FOREIGN KEY ("canaleId") REFERENCES "CanaleSegnalazioni"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegnalazioneCanale" ADD CONSTRAINT "SegnalazioneCanale_autoreId_fkey" FOREIGN KEY ("autoreId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RispostaSegnalazione" ADD CONSTRAINT "RispostaSegnalazione_segnalazioneId_fkey" FOREIGN KEY ("segnalazioneId") REFERENCES "SegnalazioneCanale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RispostaSegnalazione" ADD CONSTRAINT "RispostaSegnalazione_autoreId_fkey" FOREIGN KEY ("autoreId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllegatoSegnalazione" ADD CONSTRAINT "AllegatoSegnalazione_segnalazioneId_fkey" FOREIGN KEY ("segnalazioneId") REFERENCES "SegnalazioneCanale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

