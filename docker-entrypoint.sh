#!/bin/sh
set -e

# Le modifiche allo schema passano da migrazioni versionate, non da un
# allineamento automatico: così un riavvio non può cancellare dati.
echo "[zero-dark] applicazione migrazioni..."
if ! npx prisma migrate deploy; then
  # Database creato prima delle migrazioni (o già allineato a mano): lo
  # registriamo come partito dalla baseline invece di riapplicarla.
  echo "[zero-dark] schema già presente: registro la baseline 0_init"
  npx prisma migrate resolve --applied 0_init
  npx prisma migrate deploy
fi

echo "[zero-dark] seed iniziale (idempotente)..."
node prisma/seed.mjs || echo "[zero-dark] seed saltato"

echo "[zero-dark] avvio applicazione..."
exec "$@"
