-- Messaggi automatici verso WhatsApp: chi ha collegato il ponte, i modelli di
-- testo e il registro di cosa è partito.
--
-- Nessun token qui dentro: la sessione di WhatsApp vive nel volume del ponte,
-- come le credenziali di un telefono collegato. Qui si registra soltanto di chi
-- è il collegamento e dove scrive.
--
-- Il vincolo di unicità su (destinazione, occasione) è il pezzo che conta: è ciò
-- che impedisce a un compleanno di partire due volte lo stesso anno o a un
-- promemoria di ripetersi a ogni giro, e regge sia per i gruppi sia per le
-- persone.

CREATE TYPE "ScatenanteMessaggio" AS ENUM (
  'COMPLEANNO',
  'PROMEMORIA_ATTIVITA',
  'QUOTA_APERTA',
  'CERTIFICATO_IN_SCADENZA',
  'LIBERO'
);

CREATE TYPE "DoveMandare" AS ENUM ('GRUPPO', 'PERSONA');

CREATE TYPE "StatoMessaggio" AS ENUM ('DA_MANDARE', 'INVIATO', 'ERRORE');

CREATE TABLE "CollegamentoWhatsapp" (
  "id" TEXT NOT NULL DEFAULT 'whatsapp',
  "numero" TEXT,
  "utenteId" TEXT,
  "gruppoId" TEXT,
  "gruppoNome" TEXT,
  "collegatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultimoInvio" TIMESTAMP(3),
  "ultimoEsito" TEXT,
  CONSTRAINT "CollegamentoWhatsapp_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CollegamentoWhatsapp"
  ADD CONSTRAINT "CollegamentoWhatsapp_utenteId_fkey"
  FOREIGN KEY ("utenteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ModelloMessaggio" (
  "id" TEXT NOT NULL,
  "scatenante" "ScatenanteMessaggio" NOT NULL,
  "destinazione" "DoveMandare" NOT NULL DEFAULT 'GRUPPO',
  "gruppoId" TEXT,
  "testo" TEXT NOT NULL,
  "attivo" BOOLEAN NOT NULL DEFAULT true,
  "usatoIl" TIMESTAMP(3),
  "volte" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModelloMessaggio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModelloMessaggio_scatenante_attivo_idx"
  ON "ModelloMessaggio"("scatenante", "attivo");

CREATE TABLE "MessaggioInviato" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "scatenante" "ScatenanteMessaggio" NOT NULL,
  "modelloId" TEXT,
  "testo" TEXT NOT NULL,
  "destinazione" TEXT NOT NULL,
  "aChi" TEXT NOT NULL,
  "stato" "StatoMessaggio" NOT NULL DEFAULT 'DA_MANDARE',
  "esito" TEXT,
  "eventId" TEXT,
  "occasione" TEXT NOT NULL,
  "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "inviatoIl" TIMESTAMP(3),
  CONSTRAINT "MessaggioInviato_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessaggioInviato_destinazione_occasione_key"
  ON "MessaggioInviato"("destinazione", "occasione");
CREATE INDEX "MessaggioInviato_stato_idx" ON "MessaggioInviato"("stato");

ALTER TABLE "MessaggioInviato"
  ADD CONSTRAINT "MessaggioInviato_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessaggioInviato"
  ADD CONSTRAINT "MessaggioInviato_modelloId_fkey"
  FOREIGN KEY ("modelloId") REFERENCES "ModelloMessaggio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessaggioInviato"
  ADD CONSTRAINT "MessaggioInviato_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
