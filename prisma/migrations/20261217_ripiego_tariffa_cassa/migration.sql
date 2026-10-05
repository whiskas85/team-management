-- Polizza di ripiego: voce del tariffario o importo a mano con la sua cassa
ALTER TABLE "Impostazioni" ADD COLUMN "polizzaRipiegoTariffaId" TEXT;
ALTER TABLE "Impostazioni" ADD COLUMN "polizzaRipiegoCassaId" TEXT;
ALTER TABLE "Impostazioni" ADD CONSTRAINT "Impostazioni_polizzaRipiegoTariffaId_fkey" FOREIGN KEY ("polizzaRipiegoTariffaId") REFERENCES "Tariffa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Impostazioni" ADD CONSTRAINT "Impostazioni_polizzaRipiegoCassaId_fkey" FOREIGN KEY ("polizzaRipiegoCassaId") REFERENCES "Cassa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
