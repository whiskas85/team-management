-- Anche le altre casse hanno entrate e uscite scritte a mano. I movimenti che
-- ci sono restano della cassa del club (cassa vuota).
ALTER TABLE "MovimentoCassa" ADD COLUMN "cassaId" TEXT;
CREATE INDEX "MovimentoCassa_cassaId_idx" ON "MovimentoCassa"("cassaId");
ALTER TABLE "MovimentoCassa" ADD CONSTRAINT "MovimentoCassa_cassaId_fkey" FOREIGN KEY ("cassaId") REFERENCES "Cassa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
