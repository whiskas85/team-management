-- Il tipo di gara non c'è più.
--
-- Era un'anagrafica a parte (PCR, PLR, MILSIM, SMR…) con una tendina nel
-- modulo dell'attività, e non governava niente: raccontava soltanto che gara
-- fosse. Una casella in più da compilare per un'informazione che sta già nel
-- titolo e nella descrizione. La **durata dichiarata** in ore resta: quella
-- spiega perché una 24 ore occupi un fine settimana intero.

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_tipoGaraId_fkey";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "tipoGaraId";

-- DropTable
DROP TABLE "TipoGara";
