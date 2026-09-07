-- Merchandising: il carrello, l'ordine e la quota che ne nasce.
--
-- Quello che si ordina dal catalogo del team finisce in cassa, quindi ogni
-- ordine si porta dietro un pagamento vero, dello stesso genere di iscrizioni
-- e quote: la segreteria lo incassa con il pulsante di sempre e il saldo torna
-- da solo. Serve un tipo suo, o quegli incassi finirebbero in "Altro" e in
-- cassa non si capirebbe più cos'è cosa.
--
-- Titolo e prezzo sono **copiati** nella riga e non letti dalla voce: se la
-- maglietta passa da 25 a 28 dopo che in dieci hanno ordinato, le loro quote
-- sono già emesse a 25 e devono restare leggibili per quello che erano.
--
-- Lo stato dell'ordine non guarda i soldi ma la merce: pagato e consegnato
-- sono due cose diverse, uno paga oggi e ritira quando la fornitura arriva.
-- E il riepilogo di quanti pezzi ordinare conta solo la raccolta ancora
-- aperta: un numero che somma tutti gli ordini di sempre serve una volta
-- sola, al secondo giro mescola le magliette già ordinate con quelle nuove.

ALTER TYPE "PaymentType" ADD VALUE 'MERCHANDISING';

CREATE TYPE "StatoOrdine" AS ENUM ('RACCOLTA', 'ORDINATO', 'ARRIVATO', 'CONSEGNATO', 'ANNULLATO');

CREATE TABLE "Ordine" (
  "id" TEXT NOT NULL,
  "numero" SERIAL NOT NULL,
  "annuncioId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stato" "StatoOrdine" NOT NULL DEFAULT 'RACCOLTA',
  "note" TEXT,
  "paymentId" TEXT,
  "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ordinatoIl" TIMESTAMP(3),
  "arrivatoIl" TIMESTAMP(3),
  "consegnatoIl" TIMESTAMP(3),
  CONSTRAINT "Ordine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ordine_paymentId_key" ON "Ordine"("paymentId");
CREATE INDEX "Ordine_stato_idx" ON "Ordine"("stato");
CREATE INDEX "Ordine_userId_idx" ON "Ordine"("userId");

-- Restrict e non Cascade: un annuncio con ordini dentro non si cancella, e la
-- regola sta nel database e non in un controllo dell'interfaccia che si può
-- aggirare. Per togliere di mezzo un articolo c'è l'interruttore che lo spegne.
ALTER TABLE "Ordine"
  ADD CONSTRAINT "Ordine_annuncioId_fkey"
  FOREIGN KEY ("annuncioId") REFERENCES "Annuncio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ordine"
  ADD CONSTRAINT "Ordine_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ordine"
  ADD CONSTRAINT "Ordine_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RigaOrdine" (
  "id" TEXT NOT NULL,
  "ordineId" TEXT NOT NULL,
  "voceId" TEXT NOT NULL,
  "titolo" TEXT NOT NULL,
  "prezzo" DECIMAL(10,2) NOT NULL,
  "quantita" INTEGER NOT NULL,
  CONSTRAINT "RigaOrdine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RigaOrdine_voceId_idx" ON "RigaOrdine"("voceId");

ALTER TABLE "RigaOrdine"
  ADD CONSTRAINT "RigaOrdine_ordineId_fkey"
  FOREIGN KEY ("ordineId") REFERENCES "Ordine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RigaOrdine"
  ADD CONSTRAINT "RigaOrdine_voceId_fkey"
  FOREIGN KEY ("voceId") REFERENCES "VoceAnnuncio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
