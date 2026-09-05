-- Righe grezze lette dal portale federale: servono ad associare a mano
-- i tesseramenti che l'abbinamento automatico non ha saputo attribuire.
CREATE TABLE "TesseramentoImportato" (
  "id"          TEXT NOT NULL,
  "numero"      TEXT NOT NULL,
  "nominativo"  TEXT NOT NULL,
  "email"       TEXT,
  "comune"      TEXT,
  "qualifica"   TEXT,
  "stato"       TEXT NOT NULL,
  "tesseraAcsi" TEXT,
  "anno"        INTEGER NOT NULL,
  "idPortale"   TEXT,
  "userId"      TEXT,
  "lettoIl"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TesseramentoImportato_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TesseramentoImportato_numero_key" ON "TesseramentoImportato"("numero");
CREATE INDEX "TesseramentoImportato_anno_idx" ON "TesseramentoImportato"("anno");
CREATE INDEX "TesseramentoImportato_userId_idx" ON "TesseramentoImportato"("userId");
ALTER TABLE "TesseramentoImportato" ADD CONSTRAINT "TesseramentoImportato_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
