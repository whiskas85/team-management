-- Che gara è, e quanto dura sul volantino.
--
-- Due cose che al calendario mancavano e che di una gara sono le prime che si
-- chiedono. Il **tipo di gara** sta in un'anagrafica sua e non fra le tipologie
-- di attività: la tipologia dice come il gestionale tratta quella giornata —
-- se schiera titolari, se chiede il certificato, dove finisce la quota — il
-- tipo di gara dice che gara è, che è una cosa di chi gioca. I formati li
-- inventano gli organizzatori, quindi vivono in tabella: ne esce uno nuovo
-- ogni stagione e aggiungerlo non deve voler dire fare un rilascio.
--
-- La **durata dichiarata** è un numero di ore e basta, e non viene confrontata
-- con inizio e fine dell'attività. È voluto: una 24 ore si gioca dentro un fine
-- settimana che parte il venerdì e finisce la domenica, perché quello spazio va
-- tenuto occupato — si viaggia, si monta, si dorme, si smonta. La gara dura
-- quello che dice il volantino, l'attività dura quello che occupa. Un controllo
-- che pretendesse di farli coincidere costringerebbe a scrivere una data falsa
-- per far tacere un avviso.

CREATE TABLE "TipoGara" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descrizione" TEXT,
  "ordine" INTEGER NOT NULL DEFAULT 0,
  "attivo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TipoGara_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TipoGara_nome_key" ON "TipoGara"("nome");
CREATE INDEX "TipoGara_attivo_ordine_idx" ON "TipoGara"("attivo", "ordine");

ALTER TABLE "Event" ADD COLUMN "tipoGaraId" TEXT;
ALTER TABLE "Event" ADD COLUMN "durataOre" INTEGER;

ALTER TABLE "Event"
  ADD CONSTRAINT "Event_tipoGaraId_fkey"
  FOREIGN KEY ("tipoGaraId") REFERENCES "TipoGara"("id") ON DELETE SET NULL ON UPDATE CASCADE;
