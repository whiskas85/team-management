-- Lo stato del sistema: risparmio dell'alleggerimento, ultimi lavori, misure dello spazio.
CREATE TABLE "StatoSistema" (
    "id" TEXT NOT NULL DEFAULT 'unico',
    "byteRisparmiati" BIGINT NOT NULL DEFAULT 0,
    "fileAlleggeriti" INTEGER NOT NULL DEFAULT 0,
    "ultimiLavoriIl" TIMESTAMP(3),

    CONSTRAINT "StatoSistema_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MisuraSpazio" (
    "giorno" TEXT NOT NULL,
    "discoTotale" BIGINT NOT NULL,
    "discoLibero" BIGINT NOT NULL,
    "allegati" BIGINT NOT NULL,
    "database" BIGINT NOT NULL,
    "misuratoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MisuraSpazio_pkey" PRIMARY KEY ("giorno")
);

CREATE TABLE "FileAlleggerito" (
    "percorso" TEXT NOT NULL,
    "prima" INTEGER NOT NULL,
    "dopo" INTEGER NOT NULL,
    "il" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAlleggerito_pkey" PRIMARY KEY ("percorso")
);
