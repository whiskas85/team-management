-- La tessera FIGT arriva dal portale federale: si conservano anno, id di origine
-- e nominativo cosi' come li scrive il portale.
ALTER TABLE "FigtCard" ADD COLUMN "anno" INTEGER;
ALTER TABLE "FigtCard" ADD COLUMN "idPortale" TEXT;
ALTER TABLE "FigtCard" ADD COLUMN "nominativo" TEXT;
