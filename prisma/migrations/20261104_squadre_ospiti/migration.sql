-- Le squadre di fuori invitate a un'attività, ognuna con il suo link.
--
-- Non hanno un account qui dentro e non ha senso darglielo: a loro serve
-- sapere quando, dove e quanti siamo, a noi sapere in quanti vengono. Il
-- token è la chiave di quella porta, e apre una pagina sola.
--
-- operatori è nullable di proposito: nullo vuol dire "non hanno ancora
-- risposto", zero vuol dire "non veniamo". Sono due cose diverse.

-- CreateTable
CREATE TABLE "SquadraOspite" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "squadraId" TEXT,
    "nome" TEXT NOT NULL,
    "operatori" INTEGER,
    "token" TEXT NOT NULL,
    "rispostoIl" TIMESTAMP(3),
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SquadraOspite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SquadraOspite_token_key" ON "SquadraOspite"("token");

-- CreateIndex
CREATE INDEX "SquadraOspite_eventId_idx" ON "SquadraOspite"("eventId");

-- Una squadra sola per attività: due righe con lo stesso nome sarebbero due
-- link per gli stessi ospiti, e due numeri che si contraddicono.
-- CreateIndex
CREATE UNIQUE INDEX "SquadraOspite_eventId_nome_key" ON "SquadraOspite"("eventId", "nome");

-- AddForeignKey
ALTER TABLE "SquadraOspite" ADD CONSTRAINT "SquadraOspite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadraOspite" ADD CONSTRAINT "SquadraOspite_squadraId_fkey" FOREIGN KEY ("squadraId") REFERENCES "SquadraEsterna"("id") ON DELETE SET NULL ON UPDATE CASCADE;
