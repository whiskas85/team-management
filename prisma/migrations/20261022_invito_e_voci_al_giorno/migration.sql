-- Due cose piccole che arrivano insieme.
--
-- La visibilità «su invito». L'attività non la vede nessuno a calendario,
-- nemmeno la squadra: solo chi è stato aggiunto fra i partecipanti. Serve per
-- le cose che si organizzano con poche persone scelte, che finora andavano
-- rilasciate alla squadra intera o tenute in bozza.
--
-- Le voci di listino «al giorno». Su un'attività di più giorni si contano una
-- volta per giorno, ma solo se sono marcate così: la giornaliera vale un giorno,
-- e una 24 ore da sabato a domenica ne consuma due. Tutte le voci che c'erano
-- restano come prima, una volta sola.

ALTER TYPE "EventVisibility" ADD VALUE 'INVITO';

ALTER TABLE "Tariffa" ADD COLUMN "perGiorno" BOOLEAN NOT NULL DEFAULT false;
