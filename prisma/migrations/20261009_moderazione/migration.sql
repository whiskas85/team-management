-- Moderazione: il ruolo, e le segnalazioni.
--
-- Fin qui un commento fuori posto lo poteva togliere solo chi l'aveva scritto,
-- chi vende sotto il proprio annuncio, o l'admin. Ma tenere pulite le
-- conversazioni è un mestiere a parte da comandare la squadra: il moderatore
-- legge le segnalazioni e cancella, e non può fare nient'altro.
--
-- Il testo del messaggio si **copia dentro la segnalazione**. Se poi il
-- messaggio sparisce — tolto dal moderatore o da chi l'aveva scritto — resta
-- scritto cosa era stato segnalato: senza, la segnalazione diventerebbe un
-- rimando a niente e nessuno saprebbe più se era fondata.
--
-- I due riferimenti sono due colonne vere con la loro chiave esterna, e non
-- una sola colonna "cosa segnalata": così è il database a controllare che
-- puntino a qualcosa che esiste.

ALTER TYPE "Role" ADD VALUE 'MODERATORE';

CREATE TYPE "StatoSegnalazione" AS ENUM ('APERTA', 'ACCOLTA', 'RESPINTA');

CREATE TABLE "Segnalazione" (
  "id" TEXT NOT NULL,
  "segnalatoreId" TEXT NOT NULL,
  "commentoAnnuncioId" TEXT,
  "commentoEventoId" TEXT,
  "testo" TEXT NOT NULL,
  "autore" TEXT NOT NULL,
  "motivo" TEXT,
  "stato" "StatoSegnalazione" NOT NULL DEFAULT 'APERTA',
  "gestitaDaId" TEXT,
  "gestitaIl" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Segnalazione_pkey" PRIMARY KEY ("id")
);

-- una segnalazione per persona e per messaggio: il secondo clic non è una
-- segnalazione in più, è la stessa
CREATE UNIQUE INDEX "Segnalazione_segnalatoreId_commentoAnnuncioId_key"
  ON "Segnalazione"("segnalatoreId", "commentoAnnuncioId");
CREATE UNIQUE INDEX "Segnalazione_segnalatoreId_commentoEventoId_key"
  ON "Segnalazione"("segnalatoreId", "commentoEventoId");
CREATE INDEX "Segnalazione_stato_idx" ON "Segnalazione"("stato");

ALTER TABLE "Segnalazione"
  ADD CONSTRAINT "Segnalazione_segnalatoreId_fkey"
  FOREIGN KEY ("segnalatoreId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Segnalazione"
  ADD CONSTRAINT "Segnalazione_commentoAnnuncioId_fkey"
  FOREIGN KEY ("commentoAnnuncioId") REFERENCES "CommentoAnnuncio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Segnalazione"
  ADD CONSTRAINT "Segnalazione_commentoEventoId_fkey"
  FOREIGN KEY ("commentoEventoId") REFERENCES "CommentoEvento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Segnalazione"
  ADD CONSTRAINT "Segnalazione_gestitaDaId_fkey"
  FOREIGN KEY ("gestitaDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
