-- Le attività annullate prima che il gestionale chiudesse da sé le loro
-- quote: le stesse regole di chiudiQuoteAnnullata (src/lib/credito.ts), per
-- quello che si può fare senza toccare il credito.

-- chi non aveva versato niente non deve più niente
DELETE FROM "Payment" p
USING "Event" e
WHERE p."eventId" = e."id"
  AND e."status" = 'ANNULLATA'
  AND p."tipo" <> 'RIMBORSO'
  AND p."status" = 'DA_PAGARE'
  AND p."pagato" = 0;

-- chi aveva versato una parte, in contanti: la quota si chiude a quanto è
-- entrato. Quelle pagate in parte col credito le chiude il gestionale, che sa
-- restituirlo.
UPDATE "Payment" p
SET "importo" = p."pagato",
    "status" = 'PAGATO',
    "pagatoIl" = COALESCE(p."pagatoIl", NOW()),
    "note" = CONCAT_WS(' · ', NULLIF(p."note", ''), 'Attività annullata: chiusa a quanto versato')
FROM "Event" e
WHERE p."eventId" = e."id"
  AND e."status" = 'ANNULLATA'
  AND p."tipo" <> 'RIMBORSO'
  AND p."status" = 'PARZIALE'
  AND NOT EXISTS (SELECT 1 FROM "MovimentoCredito" m WHERE m."paymentId" = p."id");
