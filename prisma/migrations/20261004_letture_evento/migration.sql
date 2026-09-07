-- Chi ha già aperto quale attività.
--
-- Serve al pallino delle novità. Un'attività appena rilasciata è nuova **per
-- chi non l'ha ancora aperta**, non in assoluto: se la guarda il team leader,
-- agli altri deve restare segnalata. Quindi la lettura è per persona, come già
-- succede per le schede dei nuovi.
--
-- La riga nasce solo quando qualcuno apre: l'assenza vuol dire "non letta", ed
-- è lo stato di partenza di tutti — non c'è niente da scrivere il giorno che
-- si rilascia un'attività, né da riempire una volta sola per le attività che
-- esistono già.

CREATE TABLE "LetturaEvento" (
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lettoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LetturaEvento_pkey" PRIMARY KEY ("eventId", "userId")
);

CREATE INDEX "LetturaEvento_userId_idx" ON "LetturaEvento"("userId");

ALTER TABLE "LetturaEvento"
  ADD CONSTRAINT "LetturaEvento_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LetturaEvento"
  ADD CONSTRAINT "LetturaEvento_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
