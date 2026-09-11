-- Una quota può essere «gestita fuori»: si paga fuori dal gestionale, e per
-- l'app è chiusa come se fosse saldata, ma in cassa non entra niente.
-- Solo un valore in più: i pagamenti che ci sono restano come sono.

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'NON_GESTITO';
