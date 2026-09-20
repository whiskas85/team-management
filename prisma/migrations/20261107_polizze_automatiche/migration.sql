-- Le polizze giornaliere che si attivano da sole, poco prima dell'attività.
--
-- Il caso vero è la domenica mattina: alle otto si è in viaggio, nessuno apre
-- il gestionale, e chi non è stato coperto il giovedì resta scoperto. Un
-- lavoro sul server guarda ogni pochi minuti se c'è un'attività che sta per
-- cominciare e copre chi manca, con le stesse regole di sempre — ha detto
-- «ci sono», la quota è saldata, i dati ci sono.
--
-- Spenta di suo, e non per prudenza generica: ogni polizza è un soldo speso
-- che non torna indietro. Una cosa che spende da sola va accesa apposta.
ALTER TABLE "Impostazioni" ADD COLUMN "assicuraAuto" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Impostazioni" ADD COLUMN "assicuraAnticipoMin" INTEGER NOT NULL DEFAULT 60;
-- Chi l'ha accesa: le polizze automatiche partono a nome suo, perché una
-- spesa ha sempre una firma anche quando parte da sola.
ALTER TABLE "Impostazioni" ADD COLUMN "assicuraAutoDaId" TEXT;
