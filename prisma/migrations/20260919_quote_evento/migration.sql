-- La quota di un'attività si compone dal listino, come le iscrizioni, ed è
-- doppia: una per la squadra e una per chi in squadra non è. Il vecchio
-- automatismo stava sulla tipologia ("addebita ai nuovi la tariffa giocata"),
-- cioè in un posto diverso da dove si decide quanto costa l'attività: si
-- doveva configurare in due punti per ottenere una cosa sola.

ALTER TABLE "Event" ADD COLUMN "dettaglioCosto" TEXT;
ALTER TABLE "Event" ADD COLUMN "costoEsterni" DECIMAL(10,2);
ALTER TABLE "Event" ADD COLUMN "dettaglioCostoEsterni" TEXT;

ALTER TABLE "TipoAttivita" DROP COLUMN "quotaNuovi";
