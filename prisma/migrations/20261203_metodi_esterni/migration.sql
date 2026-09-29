-- I metodi di pagamento che vedono anche le squadre collegate ospiti
ALTER TABLE "MetodoPagamento" ADD COLUMN "esterni" BOOLEAN NOT NULL DEFAULT false;
