-- La sala controllo.
--
-- Il TOC c'è all'attività ma non in campo: non occupa uno dei posti contati e
-- non paga la quota, perché la quota paga il campo e lui in campo non ci va.
-- Nell'appello invece c'è, e va spuntato come tutti gli altri: era lì, e
-- segnarlo assente sarebbe falso.
--
-- Sta fra TITOLARE e RISERVA anche nell'ordine dell'enum, che è l'ordine in cui
-- la formazione si legge: prima chi gioca, poi chi coordina, poi chi aspetta.

ALTER TYPE "Assegnazione" ADD VALUE IF NOT EXISTS 'TOC' BEFORE 'RISERVA';
