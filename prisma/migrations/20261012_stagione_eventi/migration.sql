-- Ogni attività appartiene a una stagione.
--
-- Il campo c'era già ma poteva restare vuoto: le attività nate prima che la
-- stagione venisse chiesta non ne hanno una, e senza quel marchio non si
-- possono contare per anno né far tornare i conti di una stagione chiusa.
--
-- Si assegna quella in cui cade la data d'inizio; a quello che resta fuori —
-- un'attività fuori da ogni stagione conosciuta — si dà la stagione in corso,
-- che è l'unica risposta ragionevole.

UPDATE "Event" e
SET "stagioneId" = s.id
FROM "Stagione" s
WHERE e."stagioneId" IS NULL
  AND e.inizio >= s.inizio
  AND e.inizio <= s.fine;

UPDATE "Event"
SET "stagioneId" = (SELECT id FROM "Stagione" WHERE corrente = true LIMIT 1)
WHERE "stagioneId" IS NULL;
