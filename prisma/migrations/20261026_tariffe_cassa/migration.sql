-- Una voce del tariffario può dire a quale cassa vanno i suoi soldi. Vuota,
-- quella del club: tutte le voci che ci sono restano del club senza toccarle.

-- AlterTable
ALTER TABLE "Tariffa" ADD COLUMN     "cassaId" TEXT;

-- AddForeignKey
ALTER TABLE "Tariffa" ADD CONSTRAINT "Tariffa_cassaId_fkey" FOREIGN KEY ("cassaId") REFERENCES "Cassa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
