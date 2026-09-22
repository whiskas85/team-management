-- I siti esterni che possono mandare contatti al gestionale.

CREATE TABLE "SitoCollegato" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "prefisso" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creatoDaId" TEXT,
    "ultimoUsoIl" TIMESTAMP(3),
    CONSTRAINT "SitoCollegato_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Contatto" ADD COLUMN "sitoId" TEXT;

ALTER TABLE "SitoCollegato" ADD CONSTRAINT "SitoCollegato_creatoDaId_fkey" FOREIGN KEY ("creatoDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contatto" ADD CONSTRAINT "Contatto_sitoId_fkey" FOREIGN KEY ("sitoId") REFERENCES "SitoCollegato"("id") ON DELETE SET NULL ON UPDATE CASCADE;
