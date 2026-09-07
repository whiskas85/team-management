-- Mercatino, seconda parte: commenti, "mi piace" e chiocciole sulle voci.
--
-- Sotto un annuncio con cinque voci, "quanto per quella grande?" non vuol dire
-- niente. Con `@radio-m` si dice quale, e `CitazioneVoce` tiene l'indice di chi
-- è stato nominato dove. Come per le note, quell'indice si **ricava dal testo**
-- a ogni salvataggio: il testo è la verità, la tabella serve solo a ritrovarlo
-- in fretta.
--
-- `attiva` sulla voce serve a spegnerla senza cancellarla: un modello di
-- maglietta che non si fa più, o una cosa che si mette da parte. Cancellarla
-- porterebbe via anche i commenti che la nominano, che sono di altre persone.

ALTER TABLE "VoceAnnuncio" ADD COLUMN "attiva" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "CommentoAnnuncio" (
  "id" TEXT NOT NULL,
  "annuncioId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "testo" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "modificatoIl" TIMESTAMP(3),
  CONSTRAINT "CommentoAnnuncio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommentoAnnuncio_annuncioId_idx" ON "CommentoAnnuncio"("annuncioId");

ALTER TABLE "CommentoAnnuncio"
  ADD CONSTRAINT "CommentoAnnuncio_annuncioId_fkey"
  FOREIGN KEY ("annuncioId") REFERENCES "Annuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentoAnnuncio"
  ADD CONSTRAINT "CommentoAnnuncio_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CitazioneVoce" (
  "commentoId" TEXT NOT NULL,
  "voceId" TEXT NOT NULL,
  CONSTRAINT "CitazioneVoce_pkey" PRIMARY KEY ("commentoId", "voceId")
);

CREATE INDEX "CitazioneVoce_voceId_idx" ON "CitazioneVoce"("voceId");

ALTER TABLE "CitazioneVoce"
  ADD CONSTRAINT "CitazioneVoce_commentoId_fkey"
  FOREIGN KEY ("commentoId") REFERENCES "CommentoAnnuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CitazioneVoce"
  ADD CONSTRAINT "CitazioneVoce_voceId_fkey"
  FOREIGN KEY ("voceId") REFERENCES "VoceAnnuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MiPiaceAnnuncio" (
  "annuncioId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MiPiaceAnnuncio_pkey" PRIMARY KEY ("annuncioId", "userId")
);

ALTER TABLE "MiPiaceAnnuncio"
  ADD CONSTRAINT "MiPiaceAnnuncio_annuncioId_fkey"
  FOREIGN KEY ("annuncioId") REFERENCES "Annuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MiPiaceAnnuncio"
  ADD CONSTRAINT "MiPiaceAnnuncio_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
