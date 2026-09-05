-- Polizza prova (giornaliera): il portale la rilascia da una pagina diversa da
-- quella dei tesseramenti annuali e usa l'id affiliazione, non l'id anagrafica.
ALTER TABLE "CredenzialeFigt" ADD COLUMN "idAffiliazione" TEXT;
ALTER TABLE "TesseraGiornaliera" ADD COLUMN "polizzaInfortuni" TEXT;
ALTER TABLE "TesseraGiornaliera" ADD COLUMN "valeIl" TIMESTAMP(3);
