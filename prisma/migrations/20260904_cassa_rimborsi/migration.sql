-- CreateEnum
CREATE TYPE "TipoMovimento" AS ENUM ('ENTRATA', 'USCITA');

-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'RIMBORSO';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "rimborsoDiId" TEXT;

-- AlterTable
ALTER TABLE "TipoAttivita" ADD COLUMN     "soloInterno" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TipoAttivita" ADD COLUMN     "certAgonistico" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fotoPath" TEXT;

-- CreateTable
CREATE TABLE "MovimentoCassa" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "descrizione" TEXT NOT NULL,
    "importo" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoria" TEXT,
    "note" TEXT,
    "metodoId" TEXT,
    "registratoById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoCassa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimentoCassa_data_idx" ON "MovimentoCassa"("data");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_rimborsoDiId_key" ON "Payment"("rimborsoDiId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_rimborsoDiId_fkey" FOREIGN KEY ("rimborsoDiId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoCassa" ADD CONSTRAINT "MovimentoCassa_metodoId_fkey" FOREIGN KEY ("metodoId") REFERENCES "MetodoPagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoCassa" ADD CONSTRAINT "MovimentoCassa_registratoById_fkey" FOREIGN KEY ("registratoById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

