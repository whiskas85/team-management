-- Data in cui l'operatore dichiara di aver pagato: la quota resta da
-- confermare finché la segreteria non registra l'incasso.
ALTER TABLE "Payment" ADD COLUMN "dichiaratoIl" TIMESTAMP(3);
