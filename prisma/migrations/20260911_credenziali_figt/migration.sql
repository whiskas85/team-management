-- Collegamento al portale federale: una riga sola, password cifrata.
CREATE TABLE "CredenzialeFigt" (
  "id"              TEXT NOT NULL DEFAULT 'figt',
  "login"           TEXT NOT NULL,
  "passwordCifrata" TEXT NOT NULL,
  "idAnagrafica"    TEXT NOT NULL,
  "salvataDa"       TEXT,
  "salvataIl"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultimoAccesso"   TIMESTAMP(3),
  "ultimoEsito"     TEXT,
  CONSTRAINT "CredenzialeFigt_pkey" PRIMARY KEY ("id")
);
