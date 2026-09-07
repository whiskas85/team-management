-- Il posto in formazione si tiene pagando.
--
-- Su un'attività a pagamento essere scelti dal TL non basta: finché la quota
-- non è saldata si è **convocati**, non titolari. Il posto è già suo — occupa
-- uno dei posti contati — ma la formazione non è chiusa finché i soldi non
-- sono entrati. Quando l'incasso viene registrato, il convocato diventa
-- titolare da solo, senza che nessuno debba ricordarsene.
--
-- `esenteQuota` serve al caso opposto: un titolare che aveva già pagato si fa
-- male e al suo posto subentra una riserva. La somma il club l'ha già
-- incassata, e chiederla di nuovo per lo stesso posto vorrebbe dire incassarla
-- due volte. La riserva subentra esente, e il pagamento di chi si è fatto male
-- resta dov'è.

ALTER TYPE "Assegnazione" ADD VALUE IF NOT EXISTS 'CONVOCATO' BEFORE 'TITOLARE';

ALTER TABLE "EventRsvp" ADD COLUMN "esenteQuota" BOOLEAN NOT NULL DEFAULT false;
