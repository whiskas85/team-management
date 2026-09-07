-- L'admin creato all'avvio serve a non restare chiusi fuori da un'installazione
-- nuova, e basta: appena esiste un amministratore vero deve sparire da solo.
-- Per riconoscerlo con certezza va marcato, perché l'email non basta — quella
-- del seed potrebbe essere anche l'email di una persona vera.

ALTER TABLE "User" ADD COLUMN "creatoDalSeed" BOOLEAN NOT NULL DEFAULT false;

-- Gli impianti già avviati hanno l'account di partenza senza marchio. Si
-- riconosce da due cose insieme: l'indirizzo di default e il non aver mai
-- fatto accesso. Se qualcuno ci ha lavorato davvero non viene toccato.
UPDATE "User"
SET "creatoDalSeed" = true
WHERE email = 'admin@zerodark.team' AND "ultimoAccesso" IS NULL;
