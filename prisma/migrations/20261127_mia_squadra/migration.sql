-- La nostra squadra, come si presenta fuori: nome, logo, recapiti, referenti.
CREATE TABLE "MiaSquadra" (
    "id" TEXT NOT NULL DEFAULT 'mia',
    "nome" TEXT,
    "nomeGestionale" TEXT,
    "motto" TEXT,
    "logoPath" TEXT,
    "descrizione" TEXT,
    "citta" TEXT,
    "provincia" TEXT,
    "sito" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiaSquadra_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReferenteMiaSquadra" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruolo" TEXT NOT NULL,
    "mostraTelefono" BOOLEAN NOT NULL DEFAULT true,
    "mostraEmail" BOOLEAN NOT NULL DEFAULT false,
    "ordine" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReferenteMiaSquadra_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferenteMiaSquadra_userId_key" ON "ReferenteMiaSquadra"("userId");
CREATE INDEX "ReferenteMiaSquadra_ordine_idx" ON "ReferenteMiaSquadra"("ordine");

ALTER TABLE "ReferenteMiaSquadra" ADD CONSTRAINT "ReferenteMiaSquadra_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
