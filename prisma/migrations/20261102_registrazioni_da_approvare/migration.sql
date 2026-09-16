-- Chi si registra da solo aspetta il via libera, e chi viene respinto non
-- lascia dati dietro di sé.
--
-- Lo stato REGISTRATO sta prima di NUOVO: è il gradino in cui si vede una
-- pagina sola, quella che dice «la tua richiesta è in attesa». Prima chi si
-- registrava entrava dritto come contatto, e si trovava dentro il gestionale
-- senza che nessuno l'avesse guardato in faccia.
--
-- RifiutoRegistrazione non contiene dati personali: due impronte calcolate con
-- la chiave dell'installazione, la data, e chi ha deciso. Servono a riconoscere
-- chi ritenta, non a ricostruire chi era.

-- AlterEnum
ALTER TYPE "StatoOperatore" ADD VALUE 'REGISTRATO' BEFORE 'NUOVO';

-- CreateTable
CREATE TABLE "RifiutoRegistrazione" (
    "id" TEXT NOT NULL,
    "hashEmail" TEXT NOT NULL,
    "hashIdentita" TEXT NOT NULL,
    "rifiutatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rifiutatoDaId" TEXT,

    CONSTRAINT "RifiutoRegistrazione_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RifiutoRegistrazione_hashEmail_idx" ON "RifiutoRegistrazione"("hashEmail");

-- CreateIndex
CREATE INDEX "RifiutoRegistrazione_hashIdentita_idx" ON "RifiutoRegistrazione"("hashIdentita");

-- AddForeignKey
ALTER TABLE "RifiutoRegistrazione" ADD CONSTRAINT "RifiutoRegistrazione_rifiutatoDaId_fkey" FOREIGN KEY ("rifiutatoDaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- I dispositivi che hanno accettato di ricevere le notifiche: uno per
-- telefono o computer, non uno per persona. L'endpoint è unico perché lo
-- stesso dispositivo che riaccetta non deve sdoppiarsi.

-- CreateTable
CREATE TABLE "IscrizionePush" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "dispositivo" TEXT,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IscrizionePush_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IscrizionePush_endpoint_key" ON "IscrizionePush"("endpoint");

-- CreateIndex
CREATE INDEX "IscrizionePush_userId_idx" ON "IscrizionePush"("userId");

-- AddForeignKey
ALTER TABLE "IscrizionePush" ADD CONSTRAINT "IscrizionePush_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
