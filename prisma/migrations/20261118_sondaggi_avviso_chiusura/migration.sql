-- Quando e' partito l'avviso di chiusura di un sondaggio.

ALTER TABLE "Sondaggio" ADD COLUMN "chiusuraAvvisataIl" TIMESTAMP(3);

-- I sondaggi gia' chiusi o scaduti contano come avvisati: senza, al primo giro
-- dei lavori automatici partirebbe una notifica per ognuno di quelli vecchi.
UPDATE "Sondaggio"
SET "chiusuraAvvisataIl" = CURRENT_TIMESTAMP
WHERE "chiusoIl" IS NOT NULL OR ("scadeIl" IS NOT NULL AND "scadeIl" <= CURRENT_TIMESTAMP);
