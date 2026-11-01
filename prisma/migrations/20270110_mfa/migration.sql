-- Verifica in due passaggi (TOTP), facoltativa per ogni persona.
ALTER TABLE "User" ADD COLUMN "mfaSegreto" TEXT,
ADD COLUMN "mfaAttivoIl" TIMESTAMP(3),
ADD COLUMN "mfaRecupero" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "mfaUltimoPasso" INTEGER,
ADD COLUMN "mfaFalliti" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "mfaBloccatoFino" TIMESTAMP(3);
