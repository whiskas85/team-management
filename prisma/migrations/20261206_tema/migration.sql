-- Il tema della squadra, e quello di accessibilità di ognuno
ALTER TABLE "MiaSquadra" ADD COLUMN "temaAccento" TEXT, ADD COLUMN "temaModo" TEXT;
ALTER TABLE "User" ADD COLUMN "tema" TEXT, ADD COLUMN "testoGrande" BOOLEAN NOT NULL DEFAULT false;
