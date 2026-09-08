-- Due cose che il merchandising chiedeva.
--
-- **Il magazzino.** Non tutta la merce si ordina al fornitore a ogni giro: le
-- patch si comprano cento alla volta e poi si consegnano man mano. Quella roba
-- non entra nel riepilogo "da ordinare" — non c'è niente da chiedere — ma ha
-- una giacenza che scende, e finita è finita. Il carico tiene anche **quanto è
-- costata**: una patch venduta a 5 che ne è costata 4,20 è un'altra cosa da una
-- che ne è costata 1,50, e senza scriverlo non se lo ricorda nessuno.
--
-- I carichi si sommano invece di aggiornare un numero solo: resta la storia
-- dei prezzi pagati, e una quantità sbagliata si corregge togliendo la riga.
--
-- **L'accettazione del regolamento.** Il mercatino non si apre finché non se
-- ne sono lette le regole: lì non sono un cartello ma un patto fra due
-- persone. Si tiene anche la versione accettata — la data dell'ultima modifica
-- del testo — perché se il regolamento cambia aver accettato altro non è aver
-- accettato questo.

ALTER TABLE "VoceAnnuncio" ADD COLUMN "aMagazzino" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CaricoMagazzino" (
  "id" TEXT NOT NULL,
  "voceId" TEXT NOT NULL,
  "quantita" INTEGER NOT NULL,
  "costoUnitario" DECIMAL(10,2) NOT NULL,
  "fornitore" TEXT,
  "note" TEXT,
  "compratoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "registratoDaId" TEXT,
  CONSTRAINT "CaricoMagazzino_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CaricoMagazzino_voceId_idx" ON "CaricoMagazzino"("voceId");

ALTER TABLE "CaricoMagazzino"
  ADD CONSTRAINT "CaricoMagazzino_voceId_fkey"
  FOREIGN KEY ("voceId") REFERENCES "VoceAnnuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaricoMagazzino"
  ADD CONSTRAINT "CaricoMagazzino_registratoDaId_fkey"
  FOREIGN KEY ("registratoDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AccettazioneDocumento" (
  "userId" TEXT NOT NULL,
  "documentoId" TEXT NOT NULL,
  "accettatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "versione" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccettazioneDocumento_pkey" PRIMARY KEY ("userId", "documentoId")
);

CREATE INDEX "AccettazioneDocumento_documentoId_idx" ON "AccettazioneDocumento"("documentoId");

ALTER TABLE "AccettazioneDocumento"
  ADD CONSTRAINT "AccettazioneDocumento_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccettazioneDocumento"
  ADD CONSTRAINT "AccettazioneDocumento_documentoId_fkey"
  FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
