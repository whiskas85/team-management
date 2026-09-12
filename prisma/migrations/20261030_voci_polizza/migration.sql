-- Quale quota paga la polizza giornaliera lo dice la voce, non la cassa: nel
-- tariffario ogni voce ha «paga la polizza», e così le quote aggiunte con il +.
-- La polizza aspetta la quota che ne contiene una.
--
-- Si parte da quello che si faceva già: la giocata degli esterni paga la
-- giornata, e gli importi scritti a mano sul club — che la polizza aspettava
-- da sempre — continuano a contare.

-- AlterTable
ALTER TABLE "Tariffa" ADD COLUMN     "perPolizza" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "VoceAttivita" ADD COLUMN     "perPolizza" BOOLEAN NOT NULL DEFAULT false;

-- la giocata degli esterni è quella che paga la giornata
UPDATE "Tariffa" SET "perPolizza" = true WHERE 'GIOCATA_NUOVO'::"VoceTariffa" = ANY("usi");

-- le quote del club scritte a mano: la polizza le aspettava già
UPDATE "VoceAttivita" SET "perPolizza" = true WHERE "cassaId" IS NULL;

-- e quelle nate da una giocata esterni, anche se vanno a un'altra cassa
UPDATE "VoceAttivita" v SET "perPolizza" = true
WHERE EXISTS (
  SELECT 1 FROM "Tariffa" t
  WHERE 'GIOCATA_NUOVO'::"VoceTariffa" = ANY(t."usi") AND v."nome" LIKE t."nome" || '%'
);

-- la cassa non decide più: lo decide la voce
ALTER TABLE "Cassa" DROP COLUMN "perPolizza";
