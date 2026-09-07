-- Chiavi personali per gli assistenti (MCP).
--
-- Una chiave non ha poteri suoi: vale quanto l'account di chi l'ha creata. Per
-- questo qui non c'è nessuna colonna di permessi — sarebbe una seconda verità
-- da tenere allineata a quella vera, che sono i ruoli dell'utente.
--
-- Del token si conserva solo l'impronta: chi legge questa tabella non può
-- ricostruirlo. Il legame con l'utente è a cascata, così cancellare una persona
-- porta via anche le chiavi con cui si agiva per suo conto.

CREATE TABLE "TokenMcp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "prefisso" TEXT NOT NULL,
  "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultimoUsoIl" TIMESTAMP(3),
  "usi" INTEGER NOT NULL DEFAULT 0,
  "scadeIl" TIMESTAMP(3),
  "revocatoIl" TIMESTAMP(3),
  CONSTRAINT "TokenMcp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TokenMcp_userId_idx" ON "TokenMcp"("userId");

ALTER TABLE "TokenMcp"
  ADD CONSTRAINT "TokenMcp_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
