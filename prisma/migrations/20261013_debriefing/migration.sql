-- Il debriefing: il resoconto di una giornata, scritto dopo.
--
-- Una gara finisce e resta nella testa di chi c'era — cosa ha funzionato, chi
-- stava dove, l'errore che non si ripete. Scritto, diventa la memoria della
-- squadra, e chi non c'era può leggerla.
--
-- Uno per attività: è il racconto di quel giorno, non una bacheca. Commenti e
-- «mi piace» restano quelli dell'attività: si parla della stessa cosa, e
-- tenere due discussioni separate sullo stesso pomeriggio non aiuta nessuno.

CREATE TABLE "Debriefing" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "titolo" TEXT,
  "testo" TEXT NOT NULL,
  "pubblicato" BOOLEAN NOT NULL DEFAULT false,
  "autoreId" TEXT,
  "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "aggiornatoIl" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Debriefing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Debriefing_eventId_key" ON "Debriefing"("eventId");
CREATE INDEX "Debriefing_pubblicato_idx" ON "Debriefing"("pubblicato");

ALTER TABLE "Debriefing"
  ADD CONSTRAINT "Debriefing_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Debriefing"
  ADD CONSTRAINT "Debriefing_autoreId_fkey"
  FOREIGN KEY ("autoreId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
