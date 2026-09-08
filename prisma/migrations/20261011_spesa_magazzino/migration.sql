-- Una spesa di cassa può essere un acquisto di magazzino.
--
-- Si compra un blocco di patch e lo si registra come uscita: dicendo quale
-- merce e quanti pezzi, la giacenza sale da sola e il costo del pezzo si
-- ricava dividendo l'importo per i pezzi. Sono gli stessi soldi, e farli
-- scrivere due volte — una in cassa, una in magazzino — è il modo più sicuro
-- perché un giorno non tornino.
--
-- Cascade: sparita la spesa sparisce il carico. Se quei soldi non sono usciti,
-- quella roba non è entrata.

ALTER TABLE "CaricoMagazzino" ADD COLUMN "movimentoId" TEXT;

CREATE UNIQUE INDEX "CaricoMagazzino_movimentoId_key" ON "CaricoMagazzino"("movimentoId");

ALTER TABLE "CaricoMagazzino"
  ADD CONSTRAINT "CaricoMagazzino_movimentoId_fkey"
  FOREIGN KEY ("movimentoId") REFERENCES "MovimentoCassa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
