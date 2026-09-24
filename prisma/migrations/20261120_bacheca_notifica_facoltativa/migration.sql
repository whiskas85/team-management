-- Un messaggio di bacheca può uscire senza notifica push: resta il pallino.
ALTER TABLE "MessaggioBacheca" ADD COLUMN "conNotifica" BOOLEAN NOT NULL DEFAULT true;
