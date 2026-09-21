-- Le bacheche: comunicazioni che restano, con chi le ha lette.

CREATE TYPE "PubblicoBacheca" AS ENUM ('SQUADRA', 'NUOVI', 'TUTTI', 'SELEZIONE');

CREATE TABLE "Bacheca" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descrizione" TEXT,
    "pubblico" "PubblicoBacheca" NOT NULL DEFAULT 'SQUADRA',
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creataDaId" TEXT NOT NULL,
    "moderatoreId" TEXT,
    CONSTRAINT "Bacheca_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LettoreBacheca" (
    "bachecaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "LettoreBacheca_pkey" PRIMARY KEY ("bachecaId", "userId")
);

CREATE TABLE "ScrittoreBacheca" (
    "bachecaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ScrittoreBacheca_pkey" PRIMARY KEY ("bachecaId", "userId")
);

CREATE TABLE "MessaggioBacheca" (
    "id" TEXT NOT NULL,
    "bachecaId" TEXT NOT NULL,
    "autoreId" TEXT NOT NULL,
    "titolo" TEXT,
    "testo" TEXT NOT NULL,
    "bannerPath" TEXT,
    "bannerTipo" TEXT,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pubblicatoIl" TIMESTAMP(3),
    "modificatoIl" TIMESTAMP(3),
    CONSTRAINT "MessaggioBacheca_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReazioneBacheca" (
    "messaggioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "messaIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReazioneBacheca_pkey" PRIMARY KEY ("messaggioId", "userId")
);

CREATE TABLE "RispostaBacheca" (
    "id" TEXT NOT NULL,
    "messaggioId" TEXT NOT NULL,
    "autoreId" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificataIl" TIMESTAMP(3),
    CONSTRAINT "RispostaBacheca_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsegnaBacheca" (
    "messaggioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conPush" BOOLEAN NOT NULL DEFAULT false,
    "inviataIl" TIMESTAMP(3),
    "ricevutaIl" TIMESTAMP(3),
    "lettaIl" TIMESTAMP(3),
    CONSTRAINT "ConsegnaBacheca_pkey" PRIMARY KEY ("messaggioId", "userId")
);

CREATE TABLE "AllegatoBacheca" (
    "id" TEXT NOT NULL,
    "bachecaId" TEXT NOT NULL,
    "maniglia" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "caricatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caricatoDaId" TEXT NOT NULL,
    CONSTRAINT "AllegatoBacheca_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LettoreBacheca_userId_idx" ON "LettoreBacheca"("userId");
CREATE INDEX "ScrittoreBacheca_userId_idx" ON "ScrittoreBacheca"("userId");
CREATE INDEX "MessaggioBacheca_bachecaId_pubblicatoIl_idx" ON "MessaggioBacheca"("bachecaId", "pubblicatoIl");
CREATE INDEX "RispostaBacheca_messaggioId_idx" ON "RispostaBacheca"("messaggioId");
CREATE INDEX "ConsegnaBacheca_userId_lettaIl_idx" ON "ConsegnaBacheca"("userId", "lettaIl");
CREATE UNIQUE INDEX "AllegatoBacheca_bachecaId_maniglia_key" ON "AllegatoBacheca"("bachecaId", "maniglia");

ALTER TABLE "Bacheca" ADD CONSTRAINT "Bacheca_creataDaId_fkey" FOREIGN KEY ("creataDaId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bacheca" ADD CONSTRAINT "Bacheca_moderatoreId_fkey" FOREIGN KEY ("moderatoreId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LettoreBacheca" ADD CONSTRAINT "LettoreBacheca_bachecaId_fkey" FOREIGN KEY ("bachecaId") REFERENCES "Bacheca"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LettoreBacheca" ADD CONSTRAINT "LettoreBacheca_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScrittoreBacheca" ADD CONSTRAINT "ScrittoreBacheca_bachecaId_fkey" FOREIGN KEY ("bachecaId") REFERENCES "Bacheca"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScrittoreBacheca" ADD CONSTRAINT "ScrittoreBacheca_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessaggioBacheca" ADD CONSTRAINT "MessaggioBacheca_bachecaId_fkey" FOREIGN KEY ("bachecaId") REFERENCES "Bacheca"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessaggioBacheca" ADD CONSTRAINT "MessaggioBacheca_autoreId_fkey" FOREIGN KEY ("autoreId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReazioneBacheca" ADD CONSTRAINT "ReazioneBacheca_messaggioId_fkey" FOREIGN KEY ("messaggioId") REFERENCES "MessaggioBacheca"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReazioneBacheca" ADD CONSTRAINT "ReazioneBacheca_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RispostaBacheca" ADD CONSTRAINT "RispostaBacheca_messaggioId_fkey" FOREIGN KEY ("messaggioId") REFERENCES "MessaggioBacheca"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RispostaBacheca" ADD CONSTRAINT "RispostaBacheca_autoreId_fkey" FOREIGN KEY ("autoreId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsegnaBacheca" ADD CONSTRAINT "ConsegnaBacheca_messaggioId_fkey" FOREIGN KEY ("messaggioId") REFERENCES "MessaggioBacheca"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsegnaBacheca" ADD CONSTRAINT "ConsegnaBacheca_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AllegatoBacheca" ADD CONSTRAINT "AllegatoBacheca_bachecaId_fkey" FOREIGN KEY ("bachecaId") REFERENCES "Bacheca"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AllegatoBacheca" ADD CONSTRAINT "AllegatoBacheca_caricatoDaId_fkey" FOREIGN KEY ("caricatoDaId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
