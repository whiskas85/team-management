-- Un'attività può chiedere, oltre alla quota del club, una quota per ogni
-- altra cassa: il campo al club, l'istruttore a Mario. Una riga per cassa e
-- attività; la quota del club resta dov'era, sull'attività. Nessun dato
-- esistente cambia.

-- CreateTable
CREATE TABLE "QuotaCassa" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "cassaId" TEXT NOT NULL,
    "descrizione" TEXT NOT NULL,
    "importo" DECIMAL(10,2) NOT NULL,
    "importoEsterni" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotaCassa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuotaCassa_eventId_cassaId_key" ON "QuotaCassa"("eventId", "cassaId");

-- AddForeignKey
ALTER TABLE "QuotaCassa" ADD CONSTRAINT "QuotaCassa_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaCassa" ADD CONSTRAINT "QuotaCassa_cassaId_fkey" FOREIGN KEY ("cassaId") REFERENCES "Cassa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
