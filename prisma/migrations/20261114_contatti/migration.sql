-- I contatti: le persone da chiamare prima che diventino nuovi.

CREATE TYPE "OrigineContatto" AS ENUM ('SITO', 'MANO');

CREATE TABLE "Contatto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "zona" TEXT,
    "comeCiHaConosciuto" TEXT,
    "messaggio" TEXT,
    "origine" "OrigineContatto" NOT NULL DEFAULT 'SITO',
    "nota" TEXT,
    "chiamatoIl" TIMESTAMP(3),
    "consensoIl" TIMESTAMP(3),
    "impronta" TEXT,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creatoDaId" TEXT,
    CONSTRAINT "Contatto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Contatto_creatoIl_idx" ON "Contatto"("creatoIl");
CREATE INDEX "Contatto_impronta_creatoIl_idx" ON "Contatto"("impronta", "creatoIl");

ALTER TABLE "Contatto" ADD CONSTRAINT "Contatto_creatoDaId_fkey" FOREIGN KEY ("creatoDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
