-- Password generata dall'admin: va cambiata al primo accesso.
ALTER TABLE "User" ADD COLUMN "deveCambiarePassword" BOOLEAN NOT NULL DEFAULT false;
