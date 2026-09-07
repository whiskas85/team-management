-- Note private, citazioni con la chiocciola, commenti e "mi piace".
--
-- Le vecchie note (`PlayerNote`) sparivano dentro la scheda di un operatore ed
-- erano leggibili da chiunque potesse aprirla. Le nuove hanno un titolo, un
-- testo in Markdown, possono stare su una persona o su un'attività, e **le
-- legge solo chi le ha scritte**: è il patto che le rende utili, perché una
-- nota su una lite la si scrive com'è andata solo se non finisce sotto gli
-- occhi di altri. La tabella si rifà da zero invece di trasformarsi: era vuota
-- in tutti e due gli ambienti, e portarsi dietro righe senza autore avrebbe
-- creato note che nessuno può più leggere.
--
-- Commenti e "mi piace" sono l'opposto: stanno sull'attività e li vede chiunque
-- veda l'attività. Il "mi piace" ha come chiave la coppia (attività, persona),
-- così metterlo due volte è impossibile per costruzione e non per controllo.

DROP TABLE IF EXISTS "PlayerNote";

CREATE TABLE "Nota" (
  "id" TEXT NOT NULL,
  "autoreId" TEXT NOT NULL,
  "titolo" TEXT NOT NULL,
  "testo" TEXT NOT NULL,
  "userId" TEXT,
  "eventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Nota_autoreId_idx" ON "Nota"("autoreId");
CREATE INDEX "Nota_userId_idx" ON "Nota"("userId");
CREATE INDEX "Nota_eventId_idx" ON "Nota"("eventId");

ALTER TABLE "Nota"
  ADD CONSTRAINT "Nota_autoreId_fkey"
  FOREIGN KEY ("autoreId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Nota"
  ADD CONSTRAINT "Nota_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Nota"
  ADD CONSTRAINT "Nota_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NotaCitazione" (
  "notaId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "NotaCitazione_pkey" PRIMARY KEY ("notaId", "userId")
);

CREATE INDEX "NotaCitazione_userId_idx" ON "NotaCitazione"("userId");

ALTER TABLE "NotaCitazione"
  ADD CONSTRAINT "NotaCitazione_notaId_fkey"
  FOREIGN KEY ("notaId") REFERENCES "Nota"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotaCitazione"
  ADD CONSTRAINT "NotaCitazione_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CommentoEvento" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "testo" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "modificatoIl" TIMESTAMP(3),
  CONSTRAINT "CommentoEvento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommentoEvento_eventId_idx" ON "CommentoEvento"("eventId");

ALTER TABLE "CommentoEvento"
  ADD CONSTRAINT "CommentoEvento_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentoEvento"
  ADD CONSTRAINT "CommentoEvento_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MiPiaceEvento" (
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MiPiaceEvento_pkey" PRIMARY KEY ("eventId", "userId")
);

ALTER TABLE "MiPiaceEvento"
  ADD CONSTRAINT "MiPiaceEvento_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MiPiaceEvento"
  ADD CONSTRAINT "MiPiaceEvento_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
