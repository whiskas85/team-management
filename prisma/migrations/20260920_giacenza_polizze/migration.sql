-- Le polizze prova sono prepagate: quante ne restano è un dato di cassa, non
-- solo un numero sul portale federale. Si legge su richiesta e si conserva
-- qui, così la pagina non deve interrogare il portale a ogni apertura.

ALTER TABLE "CredenzialeFigt" ADD COLUMN "polizzeResidue" INTEGER;
ALTER TABLE "CredenzialeFigt" ADD COLUMN "polizzeAssegnate" INTEGER;
ALTER TABLE "CredenzialeFigt" ADD COLUMN "polizzeLetteIl" TIMESTAMP(3);
