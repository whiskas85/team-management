-- Numeri e costi delle squadre ospiti collegate (docs/COLLEGAMENTO-SQUADRE.md, fase 4).

-- CreateEnum
CREATE TYPE "CostoOspitiPer" AS ENUM ('OPERATORE', 'SQUADRA');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "costoOspiti" DECIMAL(10,2),
ADD COLUMN     "costoOspitiPer" "CostoOspitiPer",
ADD COLUMN     "numeriCondivisi" TEXT,
ADD COLUMN     "origineMandaForse" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "origineUltimiNumeri" TEXT,
ADD COLUMN     "origineVersatoIl" TIMESTAMP(3),
ADD COLUMN     "origineVersatoImporto" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "SquadraOspite" ADD COLUMN     "operatoriForse" INTEGER,
ADD COLUMN     "versatoIl" TIMESTAMP(3),
ADD COLUMN     "versatoImporto" DECIMAL(10,2);
