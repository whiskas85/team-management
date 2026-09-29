-- Una quota già pagata che non serve più può diventare credito: i soldi
-- restano in cassa, e si spendono su un'altra attività.
ALTER TYPE "TipoCredito" ADD VALUE 'DA_QUOTA';
