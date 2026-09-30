-- Allegato obbligatorio sui metodi di pagamento, e l'allegato della segnalazione
ALTER TABLE "MetodoPagamento" ADD COLUMN "allegatoObbligatorio" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "titoloAllegato" TEXT;
ALTER TABLE "Payment" ADD COLUMN "allegatoPath" TEXT, ADD COLUMN "allegatoNome" TEXT, ADD COLUMN "allegatoTipo" TEXT, ADD COLUMN "allegatoTitolo" TEXT;
