-- Versamenti a credito segnalati da chi paga, da confermare da chi tiene la cassa
CREATE TABLE "VersamentoCredito" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cassaId" TEXT,
    "importo" DECIMAL(10,2) NOT NULL,
    "metodoId" TEXT NOT NULL,
    "quando" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "allegatoPath" TEXT,
    "allegatoNome" TEXT,
    "allegatoTipo" TEXT,
    "allegatoTitolo" TEXT,
    "confermatoIl" TIMESTAMP(3),
    "confermatoDaId" TEXT,
    "movimentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersamentoCredito_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VersamentoCredito_movimentoId_key" ON "VersamentoCredito"("movimentoId");
CREATE INDEX "VersamentoCredito_cassaId_confermatoIl_idx" ON "VersamentoCredito"("cassaId", "confermatoIl");
CREATE INDEX "VersamentoCredito_userId_idx" ON "VersamentoCredito"("userId");

ALTER TABLE "VersamentoCredito" ADD CONSTRAINT "VersamentoCredito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VersamentoCredito" ADD CONSTRAINT "VersamentoCredito_cassaId_fkey" FOREIGN KEY ("cassaId") REFERENCES "Cassa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VersamentoCredito" ADD CONSTRAINT "VersamentoCredito_metodoId_fkey" FOREIGN KEY ("metodoId") REFERENCES "MetodoPagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
