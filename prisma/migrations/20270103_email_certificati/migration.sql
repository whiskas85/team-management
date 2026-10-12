-- Le email automatiche dei certificati, e il registro di quelle partite.
CREATE TABLE "EmailCertificato" (
    "id" TEXT NOT NULL,
    "quando" TEXT NOT NULL,
    "giorni" INTEGER,
    "allInteressato" BOOLEAN NOT NULL DEFAULT false,
    "destinatari" TEXT NOT NULL DEFAULT '',
    "oggetto" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "allegato" BOOLEAN NOT NULL DEFAULT true,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCertificato_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvioEmailCertificato" (
    "id" TEXT NOT NULL,
    "regolaId" TEXT NOT NULL,
    "certificatoId" TEXT NOT NULL,
    "aChi" TEXT NOT NULL DEFAULT '',
    "errore" TEXT,
    "inviatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvioEmailCertificato_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvioEmailCertificato_inviatoIl_idx" ON "InvioEmailCertificato"("inviatoIl");
CREATE UNIQUE INDEX "InvioEmailCertificato_regolaId_certificatoId_key" ON "InvioEmailCertificato"("regolaId", "certificatoId");

ALTER TABLE "InvioEmailCertificato" ADD CONSTRAINT "InvioEmailCertificato_regolaId_fkey" FOREIGN KEY ("regolaId") REFERENCES "EmailCertificato"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvioEmailCertificato" ADD CONSTRAINT "InvioEmailCertificato_certificatoId_fkey" FOREIGN KEY ("certificatoId") REFERENCES "MedicalCertificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
