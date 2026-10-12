-- Gli avvisi di scadenza mandati alla persona, per il registro dei certificati.
CREATE TABLE "AvvisoCertificato" (
    "id" TEXT NOT NULL,
    "certificatoId" TEXT NOT NULL,
    "canale" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "inviatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvvisoCertificato_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AvvisoCertificato_inviatoIl_idx" ON "AvvisoCertificato"("inviatoIl");

ALTER TABLE "AvvisoCertificato" ADD CONSTRAINT "AvvisoCertificato_certificatoId_fkey" FOREIGN KEY ("certificatoId") REFERENCES "MedicalCertificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- L'oggetto vero delle email dei certificati, per il registro.
ALTER TABLE "InvioEmailCertificato" ADD COLUMN "oggetto" TEXT;
