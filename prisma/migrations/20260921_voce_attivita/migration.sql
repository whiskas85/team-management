-- Le quote di un'attività si compongono dal tariffario, ma non tutto il
-- tariffario ha senso lì: iscrizioni e tessere federali non c'entrano niente
-- con una giocata. Questo uso marca le voci che devono comparire in quel
-- filtro — contributo campo, noleggio, extra — accanto alla giocata esterni.

ALTER TYPE "VoceTariffa" ADD VALUE IF NOT EXISTS 'ATTIVITA';
