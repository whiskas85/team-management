-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AMMINISTRAZIONE', 'SEGRETERIA', 'TL', 'ATLETA');

-- CreateEnum
CREATE TYPE "StatoOperatore" AS ENUM ('NUOVO', 'ATTESA_COMPILAZIONE', 'ATTESA_ACCETTAZIONE', 'SQUADRA', 'RIFIUTATO', 'SOSPESO', 'DISABILITATO');

-- CreateEnum
CREATE TYPE "CertStatus" AS ENUM ('IN_ATTESA', 'VALIDO', 'SCADUTO', 'RIFIUTATO');

-- CreateEnum
CREATE TYPE "CertType" AS ENUM ('NON_AGONISTICO', 'AGONISTICO');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('TEAM', 'TUTTI');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('CREATA', 'RILASCIATA', 'CONCLUSA', 'ANNULLATA');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('PRESENTE', 'ASSENTE', 'FORSE');

-- CreateEnum
CREATE TYPE "Assegnazione" AS ENUM ('NON_ASSEGNATO', 'TITOLARE', 'RISERVA');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('BOSCHIVO', 'URBANO', 'CQB', 'INDOOR', 'MISTO');

-- CreateEnum
CREATE TYPE "TipoIscrizione" AS ENUM ('ISCRIZIONE', 'REISCRIZIONE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITATA', 'COMPILATA', 'ATTIVA', 'RIFIUTATA', 'SCADUTA');

-- CreateEnum
CREATE TYPE "FigtStatus" AS ENUM ('DA_RECUPERARE', 'ATTIVA', 'SCADUTA', 'REVOCATA');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ISCRIZIONE', 'TESSERA_FIGT', 'TORNEO', 'GARA', 'ALLENAMENTO', 'EVENTO', 'ALTRO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('DA_PAGARE', 'PARZIALE', 'PAGATO', 'ANNULLATO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "callsign" TEXT,
    "telefono" TEXT,
    "dataNascita" TIMESTAMP(3),
    "luogoNascita" TEXT,
    "codiceFiscale" TEXT,
    "indirizzo" TEXT,
    "citta" TEXT,
    "cap" TEXT,
    "provincia" TEXT,
    "emergenzaNome" TEXT,
    "emergenzaTel" TEXT,
    "gruppoSanguigno" TEXT,
    "allergie" TEXT,
    "roles" "Role"[] DEFAULT ARRAY[]::"Role"[],
    "stato" "StatoOperatore" NOT NULL DEFAULT 'NUOVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "disabledAt" TIMESTAMP(3),
    "ultimoAccesso" TIMESTAMP(3),
    "privacyAccettataIl" TIMESTAMP(3),
    "privacyVersione" TEXT,
    "consensoImmagini" BOOLEAN NOT NULL DEFAULT false,
    "consensoImmaginiIl" TIMESTAMP(3),
    "consensoComunicaz" BOOLEAN NOT NULL DEFAULT false,
    "consensoComunicazIl" TIMESTAMP(3),
    "cancellazioneChiesta" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalCertificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "CertType" NOT NULL DEFAULT 'NON_AGONISTICO',
    "status" "CertStatus" NOT NULL DEFAULT 'IN_ATTESA',
    "rilasciatoIl" TIMESTAMP(3),
    "scadeIl" TIMESTAMP(3),
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "note" TEXT,
    "motivoRifiuto" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "FieldType" NOT NULL DEFAULT 'BOSCHIVO',
    "indirizzo" TEXT,
    "citta" TEXT,
    "provincia" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "referente" TEXT,
    "telefono" TEXT,
    "sito" TEXT,
    "costo" DECIMAL(10,2),
    "note" TEXT,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoAttivita" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "colore" TEXT NOT NULL DEFAULT 'verde',
    "tipoQuota" "PaymentType" NOT NULL DEFAULT 'EVENTO',
    "riserve" BOOLEAN NOT NULL DEFAULT false,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipoAttivita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetodoPagamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "istruzioni" TEXT,
    "selfService" BOOLEAN NOT NULL DEFAULT false,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetodoPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "descrizione" TEXT,
    "tipoId" TEXT,
    "visibilita" "EventVisibility",
    "status" "EventStatus" NOT NULL DEFAULT 'CREATA',
    "inizio" TIMESTAMP(3) NOT NULL,
    "fine" TIMESTAMP(3),
    "ritrovo" TEXT,
    "oraRitrovo" TIMESTAMP(3),
    "fieldId" TEXT,
    "costo" DECIMAL(10,2),
    "maxPartecipanti" INTEGER,
    "chiusuraIscrizioni" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRsvp" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL,
    "assegnazione" "Assegnazione" NOT NULL DEFAULT 'NON_ASSEGNATO',
    "presente" BOOLEAN,
    "note" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stagione" TEXT NOT NULL,
    "tipo" "TipoIscrizione" NOT NULL DEFAULT 'ISCRIZIONE',
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITATA',
    "quota" DECIMAL(10,2),
    "messaggio" TEXT,
    "compilato" TEXT,
    "note" TEXT,
    "invitataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedById" TEXT,
    "compilataIl" TIMESTAMP(3),
    "decisaIl" TIMESTAMP(3),
    "decidedById" TEXT,
    "scadeIl" TIMESTAMP(3),

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FigtCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codice" TEXT,
    "stagione" TEXT NOT NULL,
    "status" "FigtStatus" NOT NULL DEFAULT 'DA_RECUPERARE',
    "scadeIl" TIMESTAMP(3),
    "verificatoIl" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FigtCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "PaymentType" NOT NULL,
    "descrizione" TEXT NOT NULL,
    "importo" DECIMAL(10,2) NOT NULL,
    "pagato" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'DA_PAGARE',
    "metodoId" TEXT,
    "scadenza" TIMESTAMP(3),
    "pagatoIl" TIMESTAMP(3),
    "note" TEXT,
    "eventId" TEXT,
    "membershipId" TEXT,
    "figtCardId" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT,
    "testo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_stato_idx" ON "User"("stato");

-- CreateIndex
CREATE INDEX "MedicalCertificate_userId_status_idx" ON "MedicalCertificate"("userId", "status");

-- CreateIndex
CREATE INDEX "MedicalCertificate_scadeIl_idx" ON "MedicalCertificate"("scadeIl");

-- CreateIndex
CREATE UNIQUE INDEX "TipoAttivita_nome_key" ON "TipoAttivita"("nome");

-- CreateIndex
CREATE INDEX "TipoAttivita_attivo_ordine_idx" ON "TipoAttivita"("attivo", "ordine");

-- CreateIndex
CREATE UNIQUE INDEX "MetodoPagamento_nome_key" ON "MetodoPagamento"("nome");

-- CreateIndex
CREATE INDEX "MetodoPagamento_attivo_ordine_idx" ON "MetodoPagamento"("attivo", "ordine");

-- CreateIndex
CREATE INDEX "Event_inizio_idx" ON "Event"("inizio");

-- CreateIndex
CREATE INDEX "EventRsvp_userId_idx" ON "EventRsvp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRsvp_eventId_userId_key" ON "EventRsvp"("eventId", "userId");

-- CreateIndex
CREATE INDEX "Membership_status_idx" ON "Membership"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_stagione_key" ON "Membership"("userId", "stagione");

-- CreateIndex
CREATE INDEX "FigtCard_userId_idx" ON "FigtCard"("userId");

-- CreateIndex
CREATE INDEX "FigtCard_status_idx" ON "FigtCard"("status");

-- CreateIndex
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "PlayerNote_userId_idx" ON "PlayerNote"("userId");

-- AddForeignKey
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoAttivita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRsvp" ADD CONSTRAINT "EventRsvp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FigtCard" ADD CONSTRAINT "FigtCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_metodoId_fkey" FOREIGN KEY ("metodoId") REFERENCES "MetodoPagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_figtCardId_fkey" FOREIGN KEY ("figtCardId") REFERENCES "FigtCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerNote" ADD CONSTRAINT "PlayerNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerNote" ADD CONSTRAINT "PlayerNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

