-- Perché un'attività è stata annullata.
--
-- Fino a ieri restava solo il bollino "annullata", e a distanza di mesi non
-- diceva niente: pioggia, campo occupato, eravamo in quattro. Sono tre storie
-- diverse, e nello storico la differenza conta.
--
-- Nullable senza valore di partenza: le attività annullate prima di oggi non
-- hanno un motivo da inventare, e restano senza.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "motivoAnnullamento" TEXT;
