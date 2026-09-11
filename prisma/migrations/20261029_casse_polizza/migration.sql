-- Una cassa dice se la sua quota va pagata prima di assicurare un nuovo con la
-- giornaliera. Parte accesa per tutte: la polizza aspetta tutte le quote
-- dell'attività, come aspettava quella del club, finché qualcuno non decide
-- che una cassa con la giornata non c'entra.

-- AlterTable
ALTER TABLE "Cassa" ADD COLUMN     "perPolizza" BOOLEAN NOT NULL DEFAULT true;
