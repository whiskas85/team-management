-- Polizza giornaliera di ripiego per chi è in squadra senza certificato medico
ALTER TABLE "TipoAttivita" ADD COLUMN "ripiegoPolizza" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Impostazioni" ADD COLUMN "polizzaRipiego" DECIMAL(10,2);
