-- Scontrino, fattura o ricevuta di un movimento di cassa scritto a mano.
ALTER TABLE "MovimentoCassa" ADD COLUMN "allegatoPath" TEXT,
ADD COLUMN "allegatoNome" TEXT,
ADD COLUMN "allegatoTipo" TEXT;
