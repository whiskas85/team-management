-- Non tutte le attività sono attività fisiche: a una riunione o a una cena
-- sociale si va anche senza certificato medico. Il vincolo diventa una scelta
-- della tipologia, e resta acceso su tutte quelle che esistono già.

ALTER TABLE "TipoAttivita" ADD COLUMN "certMedico" BOOLEAN NOT NULL DEFAULT true;
