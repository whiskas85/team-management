-- Le attività che sono lo stesso impegno.
--
-- La domenica c'è la PLR e c'è la giocata; la notturna finisce alle tredici e
-- la diurna comincia alle otto. Sono due righe nel calendario -- e devono
-- restarlo, perché hanno due formazioni e due quote -- ma un operatore ci può
-- stare una volta sola. Contarle come due gli rovina le statistiche due volte:
-- gli abbassa la percentuale di presenze per una giornata in cui c'era, e
-- gonfia il conto con un impegno che non poteva prendere.
--
-- Quelle che si sovrappongono nel tempo il gestionale le riconosce da solo:
-- questa colonna serve per quello che l'orologio non vede, come la gara con il
-- suo allenamento del venerdì.
ALTER TABLE "Event" ADD COLUMN "collegatoAId" TEXT;

-- SetNull e non Cascade: se l'attività capofila viene cancellata, le altre
-- restano -- semplicemente tornano a contare per conto loro.
ALTER TABLE "Event" ADD CONSTRAINT "Event_collegatoAId_fkey"
  FOREIGN KEY ("collegatoAId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Event_collegatoAId_idx" ON "Event"("collegatoAId");
