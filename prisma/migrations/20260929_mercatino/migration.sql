-- Il mercatino: prima fase — annunci, voci, foto.
--
-- Un annuncio è un lotto, non un oggetto: "vendo tutto: torcia 50, tattico 100,
-- mesh 150" è un annuncio solo con tre voci. Anche un oggetto singolo è un
-- lotto di uno, così non esiste un ramo del codice che vale solo per gli
-- annunci semplici.
--
-- Due cose meritano una riga di spiegazione, perché nello schema si vedono ma
-- non si capiscono:
--
-- 1. La copertina è un riferimento dall'annuncio alla foto, e non una casella
--    "sono io la copertina" su ogni foto. Così la copertina è una per
--    costruzione: non può succedere che due foto se la contendano e la bacheca
--    ne peschi una a caso. Il vincolo di unicità sulla colonna lo garantisce.
--
-- 2. Lo stato di vendita sta sulla voce e non sull'annuncio, perché si prenota
--    la torcia mentre la mesh è ancora lì. Sulle voci riordinabili — le
--    magliette del merchandising — quello stato non vuol dire niente e non si
--    guarda: non c'è niente da esaurire.

CREATE TYPE "StatoAnnuncio" AS ENUM ('BOZZA', 'PUBBLICATO', 'RITIRATO');
CREATE TYPE "NaturaVoce" AS ENUM ('PEZZO_UNICO', 'RIORDINABILE');
CREATE TYPE "StatoVoce" AS ENUM ('DISPONIBILE', 'PRENOTATA', 'VENDUTA');

CREATE TABLE "Annuncio" (
  "id" TEXT NOT NULL,
  "titolo" TEXT NOT NULL,
  "descrizione" TEXT,
  "stato" "StatoAnnuncio" NOT NULL DEFAULT 'BOZZA',
  "ufficiale" BOOLEAN NOT NULL DEFAULT false,
  "venditoreId" TEXT NOT NULL,
  "copertinaId" TEXT,
  "pubblicatoIl" TIMESTAMP(3),
  "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "aggiornatoIl" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Annuncio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Annuncio_copertinaId_key" ON "Annuncio"("copertinaId");
CREATE INDEX "Annuncio_stato_ufficiale_idx" ON "Annuncio"("stato", "ufficiale");

CREATE TABLE "FotoAnnuncio" (
  "id" TEXT NOT NULL,
  "annuncioId" TEXT NOT NULL,
  "file" TEXT NOT NULL,
  "miniatura" TEXT NOT NULL,
  "ordine" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "FotoAnnuncio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FotoAnnuncio_annuncioId_ordine_idx" ON "FotoAnnuncio"("annuncioId", "ordine");

CREATE TABLE "VoceAnnuncio" (
  "id" TEXT NOT NULL,
  "annuncioId" TEXT NOT NULL,
  "titolo" TEXT NOT NULL,
  "maniglia" TEXT NOT NULL,
  "prezzo" DECIMAL(10,2) NOT NULL,
  "trattabile" BOOLEAN NOT NULL DEFAULT false,
  "descrizione" TEXT,
  "natura" "NaturaVoce" NOT NULL DEFAULT 'PEZZO_UNICO',
  "stato" "StatoVoce" NOT NULL DEFAULT 'DISPONIBILE',
  "prenotataDaId" TEXT,
  "prenotataIl" TIMESTAMP(3),
  "ordine" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "VoceAnnuncio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VoceAnnuncio_annuncioId_maniglia_key"
  ON "VoceAnnuncio"("annuncioId", "maniglia");
CREATE INDEX "VoceAnnuncio_annuncioId_ordine_idx" ON "VoceAnnuncio"("annuncioId", "ordine");

CREATE TABLE "Impostazioni" (
  "id" TEXT NOT NULL DEFAULT 'app',
  "nuoviPossonoVendere" BOOLEAN NOT NULL DEFAULT false,
  "aggiornatoIl" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Impostazioni_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Annuncio"
  ADD CONSTRAINT "Annuncio_venditoreId_fkey"
  FOREIGN KEY ("venditoreId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Annuncio"
  ADD CONSTRAINT "Annuncio_copertinaId_fkey"
  FOREIGN KEY ("copertinaId") REFERENCES "FotoAnnuncio"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "FotoAnnuncio"
  ADD CONSTRAINT "FotoAnnuncio_annuncioId_fkey"
  FOREIGN KEY ("annuncioId") REFERENCES "Annuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VoceAnnuncio"
  ADD CONSTRAINT "VoceAnnuncio_annuncioId_fkey"
  FOREIGN KEY ("annuncioId") REFERENCES "Annuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoceAnnuncio"
  ADD CONSTRAINT "VoceAnnuncio_prenotataDaId_fkey"
  FOREIGN KEY ("prenotataDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
