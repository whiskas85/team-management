-- La giornaliera si fa per giorno, non per attività.
--
-- La polizza prova vale fino alle 24:00 del giorno della prova. Una 24 ore che
-- parte sabato pomeriggio e finisce domenica ne vuole due, e con una riga sola
-- per persona e per attività la seconda non aveva dove stare: si assicurava il
-- sabato, e la domenica si giocava scoperti senza che niente lo dicesse.
--
-- Le coperture che c'erano valgono per il primo giorno dell'attività, che è
-- quello che il gestionale ha sempre mandato al portale. Il giorno si legge
-- sull'ora italiana: un'attività che comincia a mezzanotte e mezza non è del
-- giorno prima, come invece direbbe l'ora UTC con cui sono salvate le date.

ALTER TABLE "TesseraGiornaliera" ADD COLUMN "giorno" DATE;

UPDATE "TesseraGiornaliera" t
   SET "giorno" = (e."inizio" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::date
  FROM "Event" e
 WHERE e."id" = t."eventId";

ALTER TABLE "TesseraGiornaliera" ALTER COLUMN "giorno" SET NOT NULL;

-- una riga per persona, attività e giorno: prima il vincolo non lasciava
-- spazio alla seconda giornata
DROP INDEX "TesseraGiornaliera_userId_eventId_key";
CREATE UNIQUE INDEX "TesseraGiornaliera_userId_eventId_giorno_key"
  ON "TesseraGiornaliera"("userId", "eventId", "giorno");
