-- Le casse che non sono del club.
--
-- Un corso lo tiene Mario, e i soldi del corso sono suoi: farli incassare alla
-- segreteria per poi girarglieli era lavoro doppio, e mescolava nella cassa del
-- club conti che non sono della squadra. Adesso un pagamento può stare in
-- un'altra cassa, con i suoi metodi di pagamento e le persone abilitate a
-- gestirla.
--
-- La cassa del club non è una riga di «Cassa»: è un pagamento senza cassa.
-- Tutti i pagamenti e i metodi che c'erano restano del club senza toccarli:
-- le colonne nuove nascono vuote. Il nome di un metodo diventa unico per
-- cassa, così «Contanti» può esistere sia nel club sia nel corso.
--
-- Generata con prisma migrate diff dallo schema dell'ultimo commit.

-- DropIndex
DROP INDEX "MetodoPagamento_nome_key";

-- AlterTable
ALTER TABLE "MetodoPagamento" ADD COLUMN     "cassaId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cassaId" TEXT;

-- CreateTable
CREATE TABLE "Cassa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "attiva" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cassa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GestoriCassa" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GestoriCassa_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cassa_nome_key" ON "Cassa"("nome");

-- CreateIndex
CREATE INDEX "_GestoriCassa_B_index" ON "_GestoriCassa"("B");

-- CreateIndex
CREATE UNIQUE INDEX "MetodoPagamento_cassaId_nome_key" ON "MetodoPagamento"("cassaId", "nome");

-- CreateIndex
CREATE INDEX "Payment_cassaId_status_idx" ON "Payment"("cassaId", "status");

-- AddForeignKey
ALTER TABLE "MetodoPagamento" ADD CONSTRAINT "MetodoPagamento_cassaId_fkey" FOREIGN KEY ("cassaId") REFERENCES "Cassa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cassaId_fkey" FOREIGN KEY ("cassaId") REFERENCES "Cassa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GestoriCassa" ADD CONSTRAINT "_GestoriCassa_A_fkey" FOREIGN KEY ("A") REFERENCES "Cassa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GestoriCassa" ADD CONSTRAINT "_GestoriCassa_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

