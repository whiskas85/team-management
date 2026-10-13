-- Il formato del testo delle email dei certificati: testo, Markdown o HTML.
ALTER TABLE "EmailCertificato" ADD COLUMN "formato" TEXT NOT NULL DEFAULT 'TESTO';
