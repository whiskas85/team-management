-- Il magazzino si stacca dalla vetrina.
--
-- Erano la stessa cosa: una spunta sulla riga del merchandising diceva "questa
-- la tengo in casa". Da quella spunta discendeva tutto quello che non tornava
-- — aggiungere un generatore al magazzino lo affacciava in vetrina, e
-- toglierlo dalla vendita sembrava dire che non lo si teneva più.
--
-- Sono due elenchi diversi. Il magazzino dice **cosa ho**, la vetrina dice
-- **cosa vendo**, e fra i due c'è un collegamento facoltativo in tutt'e due i
-- versi: si tiene senza vendere (il generatore), si vende senza tenere (le
-- magliette, che si ordinano al fornitore a ogni giro), e si fa tutt'e due (le
-- patch).
--
-- Niente si perde nel passaggio: ogni voce che era a magazzino diventa un
-- articolo, e **resta collegata** alla sua riga di vetrina. Carichi, riordini
-- e giacenze seguono l'articolo. Quello che non doveva stare in vetrina — il
-- generatore, le bandiere — si stacca dopo, dalla pagina, che adesso ha il
-- pulsante per farlo.

-- ------------------------------------------------------------ il magazzino
CREATE TABLE "ArticoloMagazzino" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "categoria" TEXT,
  "note" TEXT,
  "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "aggiornatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticoloMagazzino_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArticoloMagazzino_categoria_nome_idx" ON "ArticoloMagazzino"("categoria", "nome");

-- ------------------------------------------------- il collegamento in vetrina
ALTER TABLE "VoceAnnuncio" ADD COLUMN "articoloId" TEXT;

ALTER TABLE "VoceAnnuncio"
  ADD CONSTRAINT "VoceAnnuncio_articoloId_fkey"
  FOREIGN KEY ("articoloId") REFERENCES "ArticoloMagazzino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "VoceAnnuncio_articoloId_idx" ON "VoceAnnuncio"("articoloId");

-- ------------------------------------------------------------ il travaso
-- Ogni voce tenuta a magazzino diventa un articolo con lo stesso nome. Il
-- titolo dell'annuncio fa da categoria: "Patch" — "PVC" si legge come si
-- leggeva prima, e chi apre la pagina ritrova le sue righe dov'erano.
INSERT INTO "ArticoloMagazzino" ("id", "nome", "categoria", "note", "creatoIl", "aggiornatoIl")
SELECT
  'art_' || v."id",
  v."titolo",
  a."titolo",
  v."descrizione",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "VoceAnnuncio" v
JOIN "Annuncio" a ON a."id" = v."annuncioId"
WHERE v."aMagazzino" = true;

UPDATE "VoceAnnuncio"
SET "articoloId" = 'art_' || "id"
WHERE "aMagazzino" = true;

-- ------------------------------------------------- carichi e righe di riordino
-- Seguono l'articolo: sono fatti del magazzino, non del catalogo. Un carico
-- appeso a una riga di vetrina spariva insieme a lei, e con lui la storia di
-- quanto era costata quella merce.
ALTER TABLE "CaricoMagazzino" ADD COLUMN "articoloId" TEXT;
UPDATE "CaricoMagazzino" SET "articoloId" = 'art_' || "voceId";

ALTER TABLE "RigaRiordino" ADD COLUMN "articoloId" TEXT;
UPDATE "RigaRiordino" SET "articoloId" = 'art_' || "voceId";

-- Righe orfane: un carico o un riordino su una voce che nel frattempo era
-- uscita dal magazzino non ha un articolo dove andare. Non se ne inventa uno:
-- si toglie la riga, perché parlerebbe di una giacenza che non esiste.
DELETE FROM "CaricoMagazzino"
WHERE "articoloId" NOT IN (SELECT "id" FROM "ArticoloMagazzino");

DELETE FROM "RigaRiordino"
WHERE "articoloId" NOT IN (SELECT "id" FROM "ArticoloMagazzino");

ALTER TABLE "CaricoMagazzino" ALTER COLUMN "articoloId" SET NOT NULL;
ALTER TABLE "RigaRiordino" ALTER COLUMN "articoloId" SET NOT NULL;

ALTER TABLE "CaricoMagazzino" DROP CONSTRAINT "CaricoMagazzino_voceId_fkey";
ALTER TABLE "CaricoMagazzino" DROP COLUMN "voceId";
ALTER TABLE "CaricoMagazzino"
  ADD CONSTRAINT "CaricoMagazzino_articoloId_fkey"
  FOREIGN KEY ("articoloId") REFERENCES "ArticoloMagazzino"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "CaricoMagazzino_articoloId_idx" ON "CaricoMagazzino"("articoloId");

ALTER TABLE "RigaRiordino" DROP CONSTRAINT "RigaRiordino_voceId_fkey";
ALTER TABLE "RigaRiordino" DROP COLUMN "voceId";
ALTER TABLE "RigaRiordino"
  ADD CONSTRAINT "RigaRiordino_articoloId_fkey"
  FOREIGN KEY ("articoloId") REFERENCES "ArticoloMagazzino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------ la spunta se ne va
ALTER TABLE "VoceAnnuncio" DROP COLUMN "aMagazzino";
