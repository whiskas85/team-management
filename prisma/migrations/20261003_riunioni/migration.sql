-- Le riunioni.
--
-- Una riunione è un'attività come le altre — ha una data, ci si segna, si fa
-- l'appello — ma metà del modulo non la riguarda: non c'è un punto di ritrovo
-- da raggiungere in macchina, non ci sono posti contati, non si paga niente.
--
-- Quali tipologie siano riunioni non si può decidere qui: le tipologie le
-- scrive chi usa il gestionale, e in due squadre diverse si chiamano in modi
-- diversi. Quindi è un segno sulla tipologia, non un nome scritto nel codice.
--
-- Il collegamento sta sull'attività e non sulla tipologia perché cambia ogni
-- volta: è il link della singola riunione, non una proprietà del suo genere.

ALTER TABLE "TipoAttivita" ADD COLUMN "riunione" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Event" ADD COLUMN "linkRiunione" TEXT;
