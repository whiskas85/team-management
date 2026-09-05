-- Traccia di chi ha gia' aperto la scheda di chi: alimenta il pallino sui Nuovi.
CREATE TABLE "LetturaProfilo" (
  "id"        TEXT NOT NULL,
  "profiloId" TEXT NOT NULL,
  "lettoreId" TEXT NOT NULL,
  "lettoIl"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LetturaProfilo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LetturaProfilo_profiloId_lettoreId_key" ON "LetturaProfilo"("profiloId", "lettoreId");
CREATE INDEX "LetturaProfilo_lettoreId_idx" ON "LetturaProfilo"("lettoreId");
ALTER TABLE "LetturaProfilo" ADD CONSTRAINT "LetturaProfilo_profiloId_fkey"
  FOREIGN KEY ("profiloId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LetturaProfilo" ADD CONSTRAINT "LetturaProfilo_lettoreId_fkey"
  FOREIGN KEY ("lettoreId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
