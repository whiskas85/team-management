-- Le app collegate con OpenID Connect: codici, token, consensi e chiavi di firma.
-- CreateTable
CREATE TABLE "AppCollegata" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "segretoHash" TEXT,
    "redirectUris" TEXT[],
    "attiva" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creataDaId" TEXT,

    CONSTRAINT "AppCollegata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodiceOidc" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "nonce" TEXT,
    "codeChallenge" TEXT NOT NULL,
    "scadeIl" TIMESTAMP(3) NOT NULL,
    "usatoIl" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodiceOidc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenOidc" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scadeIl" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenOidc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsensoApp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "il" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsensoApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChiaveFirma" (
    "kid" TEXT NOT NULL,
    "jwkPubblica" JSONB NOT NULL,
    "privataCifrata" TEXT NOT NULL,
    "attiva" BOOLEAN NOT NULL DEFAULT true,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChiaveFirma_pkey" PRIMARY KEY ("kid")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppCollegata_clientId_key" ON "AppCollegata"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "CodiceOidc_hash_key" ON "CodiceOidc"("hash");

-- CreateIndex
CREATE INDEX "CodiceOidc_scadeIl_idx" ON "CodiceOidc"("scadeIl");

-- CreateIndex
CREATE UNIQUE INDEX "TokenOidc_hash_key" ON "TokenOidc"("hash");

-- CreateIndex
CREATE INDEX "TokenOidc_userId_idx" ON "TokenOidc"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsensoApp_userId_appId_key" ON "ConsensoApp"("userId", "appId");

-- AddForeignKey
ALTER TABLE "CodiceOidc" ADD CONSTRAINT "CodiceOidc_appId_fkey" FOREIGN KEY ("appId") REFERENCES "AppCollegata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenOidc" ADD CONSTRAINT "TokenOidc_appId_fkey" FOREIGN KEY ("appId") REFERENCES "AppCollegata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsensoApp" ADD CONSTRAINT "ConsensoApp_appId_fkey" FOREIGN KEY ("appId") REFERENCES "AppCollegata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

