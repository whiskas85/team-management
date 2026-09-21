-- I sondaggi: una domanda fatta alla squadra, con le sue risposte.
--
-- Nasce da una cosa che si faceva su WhatsApp e si perdeva. «Quando
-- giochiamo?» in chat: risponde chi legge per primo, gli altri si accodano, e
-- il giorno dopo nessuno sa piu' cosa era stato deciso -- ne' chi non aveva
-- risposto. Qui la domanda ha un posto, una scadenza e un risultato che resta.
--
-- Tre tipi, perche' tre sono le domande che si fanno davvero: una scelta fra
-- cose (TESTO), quando ci si trova (DATA), e chi viene (PRESENZE). Gli ultimi
-- due servono a far nascere un'attivita' dal risultato: la data che ha vinto,
-- e dentro chi ha detto di esserci.

CREATE TYPE "TipoSondaggio" AS ENUM ('TESTO', 'DATA', 'PRESENZE');
CREATE TYPE "DestinatariSondaggio" AS ENUM ('SQUADRA', 'NUOVI', 'TUTTI');

CREATE TABLE "Sondaggio" (
    "id" TEXT NOT NULL,
    "domanda" TEXT NOT NULL,
    "dettaglio" TEXT,
    "tipo" "TipoSondaggio" NOT NULL DEFAULT 'TESTO',
    "destinatari" "DestinatariSondaggio" NOT NULL DEFAULT 'SQUADRA',
    "sceltaMultipla" BOOLEAN NOT NULL DEFAULT false,
    "scadeIl" TIMESTAMP(3),
    "chiusoIl" TIMESTAMP(3),
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creatoDaId" TEXT NOT NULL,
    "eventoId" TEXT,
    CONSTRAINT "Sondaggio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpzioneSondaggio" (
    "id" TEXT NOT NULL,
    "sondaggioId" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "quando" TIMESTAMP(3),
    "fino" TIMESTAMP(3),
    "ordine" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OpzioneSondaggio_pkey" PRIMARY KEY ("id")
);

-- Una riga per opzione scelta: con la scelta multipla ne ha piu' d'una, e
-- cambiare idea vuol dire cancellare le sue e riscriverle. Il conto e' sempre
-- la somma delle righe, e non c'e' un secondo posto dove il totale potrebbe
-- raccontare un'altra storia.
CREATE TABLE "VotoSondaggio" (
    "id" TEXT NOT NULL,
    "sondaggioId" TEXT NOT NULL,
    "opzioneId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VotoSondaggio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Sondaggio_eventoId_key" ON "Sondaggio"("eventoId");
CREATE INDEX "Sondaggio_chiusoIl_scadeIl_idx" ON "Sondaggio"("chiusoIl", "scadeIl");
CREATE INDEX "OpzioneSondaggio_sondaggioId_idx" ON "OpzioneSondaggio"("sondaggioId");
CREATE UNIQUE INDEX "VotoSondaggio_opzioneId_userId_key" ON "VotoSondaggio"("opzioneId", "userId");
CREATE INDEX "VotoSondaggio_sondaggioId_userId_idx" ON "VotoSondaggio"("sondaggioId", "userId");

ALTER TABLE "Sondaggio" ADD CONSTRAINT "Sondaggio_creatoDaId_fkey" FOREIGN KEY ("creatoDaId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- SetNull: cancellata l'attivita', il sondaggio resta come storia di come
-- quella giornata era stata decisa
ALTER TABLE "Sondaggio" ADD CONSTRAINT "Sondaggio_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpzioneSondaggio" ADD CONSTRAINT "OpzioneSondaggio_sondaggioId_fkey" FOREIGN KEY ("sondaggioId") REFERENCES "Sondaggio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VotoSondaggio" ADD CONSTRAINT "VotoSondaggio_sondaggioId_fkey" FOREIGN KEY ("sondaggioId") REFERENCES "Sondaggio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VotoSondaggio" ADD CONSTRAINT "VotoSondaggio_opzioneId_fkey" FOREIGN KEY ("opzioneId") REFERENCES "OpzioneSondaggio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VotoSondaggio" ADD CONSTRAINT "VotoSondaggio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
