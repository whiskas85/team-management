-- Il server di posta della squadra: da dove partono le email.

-- CreateTable
CREATE TABLE "ServerPosta" (
    "id" TEXT NOT NULL DEFAULT 'unico',
    "host" TEXT NOT NULL,
    "porta" INTEGER NOT NULL DEFAULT 465,
    "sicuro" BOOLEAN NOT NULL DEFAULT true,
    "utente" TEXT NOT NULL,
    "passwordCifrata" TEXT NOT NULL,
    "mittente" TEXT NOT NULL,
    "nomeMittente" TEXT,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "provatoIl" TIMESTAMP(3),
    "erroreProva" TEXT,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerPosta_pkey" PRIMARY KEY ("id")
);
