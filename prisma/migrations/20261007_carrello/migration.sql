-- Il carrello condiviso, e l'ordine che non è più di un articolo solo.
--
-- Un carrello che vive dentro la pagina di un articolo si svuota ogni volta
-- che si cambia articolo: si gira il catalogo, si torna indietro, e non c'è
-- più niente. Qui il carrello sta nel database, è uno per persona e attraversa
-- tutto il merchandising — una maglietta oggi, due patch domani, e si ordina
-- quando si è finito di girare.
--
-- Di conseguenza l'ordine perde il legame con un annuncio: quello che si
-- ordina insieme è **un** ordine e **una** quota, e a quale articolo appartiene
-- ogni riga lo dice già la voce che ha dentro.

CREATE TABLE "RigaCarrello" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "voceId" TEXT NOT NULL,
  "quantita" INTEGER NOT NULL,
  "aggiuntaIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RigaCarrello_pkey" PRIMARY KEY ("id")
);

-- una riga sola per voce: aggiungerla di nuovo alza il numero
CREATE UNIQUE INDEX "RigaCarrello_userId_voceId_key" ON "RigaCarrello"("userId", "voceId");
CREATE INDEX "RigaCarrello_userId_idx" ON "RigaCarrello"("userId");

ALTER TABLE "RigaCarrello"
  ADD CONSTRAINT "RigaCarrello_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RigaCarrello"
  ADD CONSTRAINT "RigaCarrello_voceId_fkey"
  FOREIGN KEY ("voceId") REFERENCES "VoceAnnuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ordine" DROP CONSTRAINT "Ordine_annuncioId_fkey";
ALTER TABLE "Ordine" DROP COLUMN "annuncioId";
