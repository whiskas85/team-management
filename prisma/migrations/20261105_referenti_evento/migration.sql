-- Chi tiene in mano un'attività: il nome a cui chiedere, il giorno prima.
--
-- Non è un ruolo e non dà poteri: è una persona da chiamare, e cambia da
-- un'uscita all'altra. Sta attaccata all'attività, non agli incarichi.

-- CreateTable
CREATE TABLE "ReferenteEvento" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ReferenteEvento_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateIndex
CREATE INDEX "ReferenteEvento_userId_idx" ON "ReferenteEvento"("userId");

-- AddForeignKey
ALTER TABLE "ReferenteEvento" ADD CONSTRAINT "ReferenteEvento_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenteEvento" ADD CONSTRAINT "ReferenteEvento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
