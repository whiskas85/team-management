-- I soldi delle squadre ospiti collegate finiscono in una cassa, con conferma dell'incasso.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "cassaOspitiId" TEXT,
ADD COLUMN     "origineVersatoConfermatoIl" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SquadraOspite" ADD COLUMN     "confermatoDaId" TEXT,
ADD COLUMN     "confermatoIl" TIMESTAMP(3),
ADD COLUMN     "movimentoCassaId" TEXT,
ADD COLUMN     "versatoMetodo" TEXT,
ADD COLUMN     "versatoNote" TEXT;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_cassaOspitiId_fkey" FOREIGN KEY ("cassaOspitiId") REFERENCES "Cassa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
