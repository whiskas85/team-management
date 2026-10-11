-- Una macchina è privata finché chi guida non la rende visibile a chi viene.
ALTER TABLE "Macchina" ADD COLUMN "pubblica" BOOLEAN NOT NULL DEFAULT false;
