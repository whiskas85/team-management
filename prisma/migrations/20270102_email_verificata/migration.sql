-- La verifica dell'email: l'indirizzo confermato col link, e quando.
ALTER TABLE "User" ADD COLUMN "emailVerificata" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerificataIl" TIMESTAMP(3);
