-- Le righe nuove di Miei pagamenti: quello che è nato dopo l'ultima visita.
-- Chi c'è già parte da adesso, così non si ritrova tutto «nuovo».
ALTER TABLE "User" ADD COLUMN "pagamentiVistiIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- I movimenti già scritti prendono la loro data: sono vecchi comunque.
ALTER TABLE "MovimentoCredito" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "MovimentoCredito" SET "createdAt" = "data";
