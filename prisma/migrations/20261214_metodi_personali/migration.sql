-- I metodi per pagare una persona, e a chi va un'uscita di cassa.
CREATE TABLE "MetodoPersonale" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "istruzioni" TEXT,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetodoPersonale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MetodoPersonale_userId_idx" ON "MetodoPersonale"("userId");

ALTER TABLE "MetodoPersonale" ADD CONSTRAINT "MetodoPersonale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MovimentoCassa" ADD COLUMN "beneficiarioId" TEXT;

ALTER TABLE "MovimentoCassa" ADD CONSTRAINT "MovimentoCassa_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
