-- Il consenso a far sapere dove si abita, dato una volta; la macchina di
-- ognuno ricordata; prezzo del carburante e autostrada trovati fuori.
ALTER TABLE "User" ADD COLUMN "consensoIndirizzoIl" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "autoAlimentazione" TEXT;
ALTER TABLE "User" ADD COLUMN "autoConsumo" DOUBLE PRECISION;
ALTER TABLE "Macchina" ADD COLUMN "alimentazione" TEXT;
ALTER TABLE "Macchina" ADD COLUMN "prezzoAuto" DECIMAL(6,3);
ALTER TABLE "Macchina" ADD COLUMN "prezzoFonte" TEXT;
ALTER TABLE "Macchina" ADD COLUMN "prezzoFirma" TEXT;
ALTER TABLE "Macchina" ADD COLUMN "kmAutostrada" INTEGER;
