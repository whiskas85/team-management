-- Copertura assicurativa di chi gioca senza tessera annuale: la giornaliera
-- vale per quella persona in quella attivita'.
CREATE TYPE "StatoAssicurazione" AS ENUM ('NON_ASSICURATO', 'RICHIESTA', 'ASSICURATO', 'ERRORE');

CREATE TABLE "TesseraGiornaliera" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "eventId"       TEXT NOT NULL,
  "stato"         "StatoAssicurazione" NOT NULL DEFAULT 'NON_ASSICURATO',
  "codice"        TEXT,
  "idPortale"     TEXT,
  "richiestaIl"   TIMESTAMP(3),
  "emessaIl"      TIMESTAMP(3),
  "esito"         TEXT,
  "richiestaDaId" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TesseraGiornaliera_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TesseraGiornaliera_userId_eventId_key" ON "TesseraGiornaliera"("userId", "eventId");
CREATE INDEX "TesseraGiornaliera_eventId_idx" ON "TesseraGiornaliera"("eventId");
ALTER TABLE "TesseraGiornaliera" ADD CONSTRAINT "TesseraGiornaliera_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TesseraGiornaliera" ADD CONSTRAINT "TesseraGiornaliera_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
