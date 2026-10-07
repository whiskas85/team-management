-- Di chi è un campo: nostro, di un'altra squadra (squadraId), o di nessuna.
-- Fin qui «senza squadra» voleva dire «nostro»: restano nostri.
ALTER TABLE "Field" ADD COLUMN "nostro" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Field" SET "nostro" = true WHERE "squadraId" IS NULL;
