-- I riordini al fornitore: la merce che il team compra per sé.
--
-- È il contrario di un ordine del merchandising — lì la squadra compra dal
-- team, qui il team compra dal fornitore — e per questo tocca la cassa dalla
-- parte delle **uscite**.
--
-- I due passaggi restano separati perché nella realtà lo sono: si paga quando
-- si paga e la roba arriva quando arriva, a volte prima, a volte tre settimane
-- dopo. Premuto il primo pulsante esce il movimento di cassa; premuto il
-- secondo la merce entra in magazzino con un carico, e il registro può dire
-- *+50 per l'ordine 7* invece di un +50 che non si sa da dove esca.

CREATE TYPE "StatoRiordino" AS ENUM ('APERTO', 'PAGATO', 'RICEVUTO', 'ANNULLATO');

CREATE TABLE "Riordino" (
  "id" TEXT NOT NULL,
  "numero" SERIAL NOT NULL,
  "fornitore" TEXT,
  "note" TEXT,
  "stato" "StatoRiordino" NOT NULL DEFAULT 'APERTO',
  "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pagatoIl" TIMESTAMP(3),
  "ricevutoIl" TIMESTAMP(3),
  "movimentoId" TEXT,
  "creatoDaId" TEXT,
  CONSTRAINT "Riordino_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Riordino_movimentoId_key" ON "Riordino"("movimentoId");
CREATE INDEX "Riordino_stato_idx" ON "Riordino"("stato");

ALTER TABLE "Riordino"
  ADD CONSTRAINT "Riordino_movimentoId_fkey"
  FOREIGN KEY ("movimentoId") REFERENCES "MovimentoCassa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Riordino"
  ADD CONSTRAINT "Riordino_creatoDaId_fkey"
  FOREIGN KEY ("creatoDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RigaRiordino" (
  "id" TEXT NOT NULL,
  "riordinoId" TEXT NOT NULL,
  "voceId" TEXT NOT NULL,
  "quantita" INTEGER NOT NULL,
  "costoUnitario" DECIMAL(10,2) NOT NULL,
  CONSTRAINT "RigaRiordino_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RigaRiordino_riordinoId_idx" ON "RigaRiordino"("riordinoId");

ALTER TABLE "RigaRiordino"
  ADD CONSTRAINT "RigaRiordino_riordinoId_fkey"
  FOREIGN KEY ("riordinoId") REFERENCES "Riordino"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Restrict: una voce con dei riordini dentro non si cancella, o il registro di
-- magazzino resterebbe a parlare di una cosa che non esiste più.
ALTER TABLE "RigaRiordino"
  ADD CONSTRAINT "RigaRiordino_voceId_fkey"
  FOREIGN KEY ("voceId") REFERENCES "VoceAnnuncio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CaricoMagazzino" ADD COLUMN "rigaRiordinoId" TEXT;

CREATE UNIQUE INDEX "CaricoMagazzino_rigaRiordinoId_key" ON "CaricoMagazzino"("rigaRiordinoId");

ALTER TABLE "CaricoMagazzino"
  ADD CONSTRAINT "CaricoMagazzino_rigaRiordinoId_fkey"
  FOREIGN KEY ("rigaRiordinoId") REFERENCES "RigaRiordino"("id") ON DELETE SET NULL ON UPDATE CASCADE;
