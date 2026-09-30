-- Il testo più grande si sceglie a parte per il telefono: parte uguale a
-- quello di prima, che valeva ovunque.
ALTER TABLE "User" ADD COLUMN "testoGrandeMobile" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" SET "testoGrandeMobile" = "testoGrande";
