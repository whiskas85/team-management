-- Il ritrovo e il posto, con le coordinate.
--
-- Il punto di ritrovo era una casella di testo: "autogrill A4 uscita Bergamo"
-- si legge, ma non porta nessuno da nessuna parte. Con le coordinate accanto
-- diventa un posto vero — si vede sulla mappa e ci si fa portare.
--
-- `luogo` serve al caso opposto del campo: non tutto quello che si fa insieme
-- succede su un campo censito. Una fiera, un parcheggio, la sede di un'altra
-- squadra: costringere a inventare un campo in anagrafica per ognuno di questi
-- sporcherebbe l'elenco dei campi, che è la cosa che si vuole tenere pulita.

ALTER TABLE "Event" ADD COLUMN "ritrovoLat" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN "ritrovoLng" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN "luogo" TEXT;
ALTER TABLE "Event" ADD COLUMN "luogoLat" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN "luogoLng" DOUBLE PRECISION;
