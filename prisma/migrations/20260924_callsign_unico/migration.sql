-- Il callsign non è un soprannome qualsiasi: con quello si entra, al posto
-- dell'email. Due uguali rendono l'accesso ambiguo — il login, trovandone due,
-- si arrende e chiede l'indirizzo.
--
-- I controlli nell'applicazione dicono "questo è già di Tizio" con una frase
-- comprensibile; questo indice è la rete sotto, per i casi che sfuggono a un
-- controllo fatto prima della scrittura: due moduli inviati nello stesso
-- istante. È su lower() perché "Wolf" e "wolf" sono la stessa persona, e
-- ignora i vuoti perché il callsign non è obbligatorio.

CREATE UNIQUE INDEX "User_callsign_unico"
  ON "User" (lower(callsign))
  WHERE callsign IS NOT NULL AND callsign <> '';
