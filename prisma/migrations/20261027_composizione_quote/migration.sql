-- Com'è stata composta ogni quota — l'importo scritto a mano e le voci del
-- tariffario spuntate — per riaprire il modulo dell'attività com'era. I
-- totali restano dove sono; le quote che ci sono partono senza voci e con
-- l'importo a mano vuoto, e il modulo le riapre con il totale.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "costoAMano" DECIMAL(10,2),
ADD COLUMN     "costoEsterniAMano" DECIMAL(10,2),
ADD COLUMN     "vociEsterni" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vociSquadra" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "QuotaCassa" ADD COLUMN     "importoAMano" DECIMAL(10,2),
ADD COLUMN     "importoEsterniAMano" DECIMAL(10,2),
ADD COLUMN     "voci" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vociEsterni" TEXT[] DEFAULT ARRAY[]::TEXT[];
