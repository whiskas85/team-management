-- Il kit a noleggio per i nuovi: quanti ce ne sono per attività, e chi l'ha
-- chiesto o l'ha avuto confermato.
CREATE TYPE "NoleggioStato" AS ENUM ('RICHIESTO', 'CONFERMATO');

ALTER TABLE "Event" ADD COLUMN "kitNoleggio" INTEGER;

ALTER TABLE "EventRsvp" ADD COLUMN "noleggio" "NoleggioStato",
ADD COLUMN "noleggioImporto" DECIMAL(10,2),
ADD COLUMN "noleggioCassaId" TEXT;
