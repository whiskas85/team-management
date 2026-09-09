-- I preferiti: il proprio menu, non un menu diverso per ruolo.
--
-- Il gestionale ha una quarantina di pagine e nessuno le usa tutte: chi tiene
-- la cassa vive su tre schermate, un atleta su due, e sono tre schermate
-- diverse. Con una stellina in cima a ogni pagina ognuno si compone le sue —
-- in cima al menu sul computer, nella barra in basso sul telefono, dove il
-- pollice arriva senza aprire niente.
--
-- Si conserva solo l'indirizzo. Etichetta e icona si ripescano ogni volta dal
-- menu vero, così una voce che cambia nome cambia nome anche qui, e una voce
-- che una persona non può più vedere sparisce dai suoi preferiti da sola
-- invece di restare a puntare su una porta chiusa.

CREATE TABLE "Preferito" (
  "userId" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "ordine" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Preferito_pkey" PRIMARY KEY ("userId", "href")
);

CREATE INDEX "Preferito_userId_ordine_idx" ON "Preferito"("userId", "ordine");

ALTER TABLE "Preferito"
  ADD CONSTRAINT "Preferito_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
