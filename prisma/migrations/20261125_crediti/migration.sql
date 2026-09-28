-- Il credito delle persone: soldi versati prima delle quote, che le quote poi
-- consumano. Un registro di movimenti, il saldo è la loro somma.

-- CreateEnum
CREATE TYPE "TipoCredito" AS ENUM ('VERSAMENTO', 'USO', 'RIPRESO', 'RESO');

-- CreateTable
CREATE TABLE "MovimentoCredito" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cassaId" TEXT,
    "tipo" "TipoCredito" NOT NULL,
    "importo" DECIMAL(10,2) NOT NULL,
    "paymentId" TEXT,
    "metodoId" TEXT,
    "descrizione" TEXT NOT NULL,
    "note" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registratoDaId" TEXT,

    CONSTRAINT "MovimentoCredito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimentoCredito_userId_cassaId_idx" ON "MovimentoCredito"("userId", "cassaId");

-- CreateIndex
CREATE INDEX "MovimentoCredito_cassaId_idx" ON "MovimentoCredito"("cassaId");

-- CreateIndex
CREATE INDEX "MovimentoCredito_paymentId_idx" ON "MovimentoCredito"("paymentId");

-- AddForeignKey
ALTER TABLE "MovimentoCredito" ADD CONSTRAINT "MovimentoCredito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoCredito" ADD CONSTRAINT "MovimentoCredito_cassaId_fkey" FOREIGN KEY ("cassaId") REFERENCES "Cassa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoCredito" ADD CONSTRAINT "MovimentoCredito_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoCredito" ADD CONSTRAINT "MovimentoCredito_metodoId_fkey" FOREIGN KEY ("metodoId") REFERENCES "MetodoPagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoCredito" ADD CONSTRAINT "MovimentoCredito_registratoDaId_fkey" FOREIGN KEY ("registratoDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

