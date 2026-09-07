-- Statuto e regolamenti passano dai file al database.
--
-- Finché erano due testi fissi, due file Markdown nel volume erano la forma
-- giusta: si leggevano anche senza il gestionale acceso. Da quando i
-- regolamenti sono un elenco — condotta, mercatino, quelli che verranno —
-- servono titolo, ordine e la traccia di chi li ha toccati, e un indice a
-- fianco dei file sarebbe stata una tabella scritta peggio.
--
-- Qui si crea solo la tabella vuota: i due testi che stanno nei file li importa
-- il seed all'avvio, perché una migrazione SQL il volume non lo può leggere.
-- Finché non sono importati non si perde niente — i file restano dove sono.

CREATE TYPE "TipoDocumento" AS ENUM ('STATUTO', 'REGOLAMENTO');

CREATE TABLE "Documento" (
  "id" TEXT NOT NULL,
  "tipo" "TipoDocumento" NOT NULL,
  "slug" TEXT NOT NULL,
  "titolo" TEXT NOT NULL,
  "sottotitolo" TEXT,
  "testo" TEXT NOT NULL,
  "ordine" INTEGER NOT NULL DEFAULT 0,
  "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "aggiornatoIl" TIMESTAMP(3) NOT NULL,
  "aggiornatoDaId" TEXT,
  CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Documento_slug_key" ON "Documento"("slug");
CREATE INDEX "Documento_tipo_ordine_idx" ON "Documento"("tipo", "ordine");

ALTER TABLE "Documento"
  ADD CONSTRAINT "Documento_aggiornatoDaId_fkey"
  FOREIGN KEY ("aggiornatoDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
