-- Il margine per tappa con cui si pianificano gli orari del viaggio.
ALTER TABLE "Macchina" ADD COLUMN "minutiTappa" INTEGER NOT NULL DEFAULT 5;
