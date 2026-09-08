-- Chi ha letto quale debriefing.
--
-- La lettura è di chi legge e non della squadra: se lo apre un altro, a te
-- resta segnalato. È la stessa idea del pallino sulle attività nuove — un
-- resoconto che nessuno sa di dover leggere non lo legge nessuno.

CREATE TABLE "LetturaDebriefing" (
  "debriefingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lettoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LetturaDebriefing_pkey" PRIMARY KEY ("debriefingId", "userId")
);

CREATE INDEX "LetturaDebriefing_userId_idx" ON "LetturaDebriefing"("userId");

ALTER TABLE "LetturaDebriefing"
  ADD CONSTRAINT "LetturaDebriefing_debriefingId_fkey"
  FOREIGN KEY ("debriefingId") REFERENCES "Debriefing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LetturaDebriefing"
  ADD CONSTRAINT "LetturaDebriefing_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
