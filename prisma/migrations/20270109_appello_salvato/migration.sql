-- L'ultimo appello salvato di un'attività: quando e da chi.
ALTER TABLE "Event" ADD COLUMN "appelloIl" TIMESTAMP(3),
ADD COLUMN "appelloDaId" TEXT;

ALTER TABLE "Event" ADD CONSTRAINT "Event_appelloDaId_fkey" FOREIGN KEY ("appelloDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
