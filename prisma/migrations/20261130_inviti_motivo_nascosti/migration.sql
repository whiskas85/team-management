-- Il perché di un invito rifiutato, e gli inviti tolti dalla vista senza rispondere.
ALTER TABLE "SquadraOspite" ADD COLUMN "motivoRifiuto" TEXT;
ALTER TABLE "Event" ADD COLUMN "origineNascosta" BOOLEAN NOT NULL DEFAULT false;
