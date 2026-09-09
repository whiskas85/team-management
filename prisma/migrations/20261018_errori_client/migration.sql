-- Gli errori che capitano nel browser, con quello che si stava facendo.
--
-- Il messaggio «qualcosa si è rotto» si cura ricaricando, e per chi lo vede
-- finisce lì. Per noi finiva lì anche l'informazione: nessuno sa cosa fosse
-- aperto, cosa era stato premuto, se era già successo ad altri. Un difetto che
-- si presenta una volta al mese e non lascia traccia non si corregge — ci si
-- convive, e la gente smette pure di segnalarlo perché tanto «poi funziona».
--
-- Adesso, prima del pulsante Ricarica, la scheda spedisce quello che sa:
-- l'errore con la pila di chiamate, l'indirizzo, la versione del gestionale, e
-- il diario di bordo — le ultime cose successe con l'orario accanto. È
-- quest'ultimo a rispondere alla domanda che restava senza risposta: cosa
-- stava facendo.

CREATE TABLE "ErroreClient" (
  "id" TEXT NOT NULL,
  "quando" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  "messaggio" TEXT NOT NULL,
  "nome" TEXT,
  "digest" TEXT,
  "stack" TEXT,
  "indirizzo" TEXT,
  "agente" TEXT,
  "versione" TEXT,
  "diario" TEXT,
  "origine" TEXT,
  "visto" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ErroreClient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ErroreClient_quando_idx" ON "ErroreClient"("quando");
CREATE INDEX "ErroreClient_visto_quando_idx" ON "ErroreClient"("visto", "quando");

ALTER TABLE "ErroreClient"
  ADD CONSTRAINT "ErroreClient_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
