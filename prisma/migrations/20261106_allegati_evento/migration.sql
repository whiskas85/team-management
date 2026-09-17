-- Gli allegati di un'attività: il book di missione, prima di tutto.
--
-- Tre formati e non uno: il PDF di chi impagina, il Markdown di chi scrive a
-- mano, l'HTML di chi esporta da un altro programma. Il file sta fuori da
-- public/ come tutti gli altri caricamenti: ci si arriva solo passando da una
-- rotta che prima controlla chi sta chiedendo.
--
-- pubblico è spento di suo: fra gli allegati finiscono anche le cose nostre,
-- e mandarne uno fuori deve essere un gesto, non quello che succede da solo.

-- CreateTable
CREATE TABLE "AllegatoEvento" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "pubblico" BOOLEAN NOT NULL DEFAULT false,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "caricatoDaId" TEXT,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllegatoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AllegatoEvento_eventId_ordine_idx" ON "AllegatoEvento"("eventId", "ordine");

-- L'allegato vive con la sua attività: cancellata quella, non ha più un posto.
-- AddForeignKey
ALTER TABLE "AllegatoEvento" ADD CONSTRAINT "AllegatoEvento_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Chi l'ha caricato può andarsene dalla squadra: il book resta, senza un nome
-- accanto. Cancellare il documento perché se n'è andato chi l'ha portato
-- sarebbe perdere il lavoro di tutti per la scelta di uno.
-- AddForeignKey
ALTER TABLE "AllegatoEvento" ADD CONSTRAINT "AllegatoEvento_caricatoDaId_fkey" FOREIGN KEY ("caricatoDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
