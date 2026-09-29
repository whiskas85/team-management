-- Eventi condivisi fra gestionali collegati (docs/COLLEGAMENTO-SQUADRE.md, fase 3).

-- CreateEnum
CREATE TYPE "AccessoEvento" AS ENUM ('VISUALIZZAZIONE', 'GESTIONE');

-- CreateEnum
CREATE TYPE "RispostaInvito" AS ENUM ('IN_ATTESA', 'ACCETTATA', 'RIFIUTATA');

-- AlterEnum
ALTER TYPE "EventStatus" ADD VALUE 'INVITATA';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "origineAccesso" "AccessoEvento",
ADD COLUMN     "origineAggiornataIl" TIMESTAMP(3),
ADD COLUMN     "origineCollegamentoId" TEXT,
ADD COLUMN     "origineDati" JSONB,
ADD COLUMN     "origineIdRemoto" TEXT,
ADD COLUMN     "origineInvitaAltri" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SquadraOspite" ADD COLUMN     "accesso" "AccessoEvento",
ADD COLUMN     "collegamentoId" TEXT,
ADD COLUMN     "invitaAltri" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "risposta" "RispostaInvito";

-- CreateIndex
CREATE UNIQUE INDEX "Event_origineCollegamentoId_origineIdRemoto_key" ON "Event"("origineCollegamentoId", "origineIdRemoto");

-- AddForeignKey
ALTER TABLE "SquadraOspite" ADD CONSTRAINT "SquadraOspite_collegamentoId_fkey" FOREIGN KEY ("collegamentoId") REFERENCES "CollegamentoSquadra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_origineCollegamentoId_fkey" FOREIGN KEY ("origineCollegamentoId") REFERENCES "CollegamentoSquadra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
