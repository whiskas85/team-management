-- Una quota chiusa (trasformata in credito, annullata, gestita fuori) non
-- aspetta conferme: la vecchia segnalazione rimasta attaccata la faceva
-- ricomparire fra i pagamenti «da confermare».
UPDATE "Payment"
SET "dichiaratoIl" = NULL
WHERE "dichiaratoIl" IS NOT NULL
  AND "status" IN ('ANNULLATO', 'NON_GESTITO');
