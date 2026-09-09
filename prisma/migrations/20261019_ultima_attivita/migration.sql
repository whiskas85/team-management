-- L'ultima volta che una persona ha usato il gestionale, non che ci è entrata.
--
-- Sono due cose diverse, e la seconda dice poco: chi ha spuntato «ricordami»
-- non fa un accesso per due mesi pur aprendo l'applicazione tutti i giorni, e
-- dalla sua scheda sembrava sparito. Peggio: chi tiene i conti guardava quella
-- data per capire se valeva la pena mandare un messaggio, e la leggeva
-- sbagliata.
--
-- Si aggiorna mentre si naviga, non al momento di entrare. Parte dall'ultimo
-- accesso conosciuto per non far sembrare che nessuno abbia mai usato niente
-- il giorno del rilascio.

ALTER TABLE "User" ADD COLUMN "ultimaAttivita" TIMESTAMP(3);

UPDATE "User" SET "ultimaAttivita" = "ultimoAccesso" WHERE "ultimoAccesso" IS NOT NULL;
