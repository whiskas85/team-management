-- Re-inviti: da chi arriva un invito, e i link chiesti da una squadra per un'altra
ALTER TABLE "SquadraOspite" ADD COLUMN "propostaDa" TEXT;
ALTER TABLE "LinkCollegamento" ALTER COLUMN "creatoDaId" DROP NOT NULL;
ALTER TABLE "LinkCollegamento" ADD COLUMN "perConto" TEXT;
ALTER TABLE "CollegamentoSquadra" ADD COLUMN "nota" TEXT;
