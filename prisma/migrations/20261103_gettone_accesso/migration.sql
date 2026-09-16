-- Il link che fa entrare una volta sola.
--
-- Al posto di dettare una password a voce, l'admin manda un link: chi lo apre
-- entra e sceglie subito la sua password. Del gettone resta solo l'impronta,
-- come per le password: quello che sta nel database non fa entrare nessuno.

-- CreateTable
CREATE TABLE "GettoneAccesso" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scadeIl" TIMESTAMP(3) NOT NULL,
    "usatoIl" TIMESTAMP(3),
    "creatoDaId" TEXT,

    CONSTRAINT "GettoneAccesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GettoneAccesso_hash_key" ON "GettoneAccesso"("hash");

-- CreateIndex
CREATE INDEX "GettoneAccesso_userId_idx" ON "GettoneAccesso"("userId");

-- AddForeignKey
ALTER TABLE "GettoneAccesso" ADD CONSTRAINT "GettoneAccesso_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GettoneAccesso" ADD CONSTRAINT "GettoneAccesso_creatoDaId_fkey" FOREIGN KEY ("creatoDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
