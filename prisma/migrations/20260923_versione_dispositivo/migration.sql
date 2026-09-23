-- La versione che ogni persona ha davvero in mano: quella del gestionale
-- all'ultimo passaggio, e quella del service worker sul suo dispositivo.
ALTER TABLE "User" ADD COLUMN "versioneApp" TEXT;
ALTER TABLE "User" ADD COLUMN "versioneSw" TEXT;
ALTER TABLE "User" ADD COLUMN "versioneSwIl" TIMESTAMP(3);
