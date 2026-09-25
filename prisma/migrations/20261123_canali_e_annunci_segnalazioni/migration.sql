-- Dati, non schema: i canali di segnalazione di partenza e tre annunci in
-- BOZZA (nessuna notifica parte: li rilascia l'admin dopo averli riletti).
-- Id fissi, cosi' gli annunci possono puntare ai canali e rieseguire non
-- duplica niente. Chi li firma: chi ha creato la prima bacheca, o in
-- mancanza il primo admin. Senza nessuno dei due non si crea niente.

INSERT INTO "CanaleSegnalazioni" ("id", "titolo", "descrizione", "icona", "firma", "pubblico", "conAllegati", "ordine", "creatoDaId")
SELECT $zd$zd-canale-comportamenti$zd$, $zd$Comportamenti scorretti$zd$, $zd$Qui racconti un **comportamento scorretto**: in campo, nei gruppi, o nei tuoi confronti.

- cosa è successo, **quando** e **dove**
- chi c'era: con @ puoi nominare le persone coinvolte (non ricevono nessun avviso)
- se hai foto o screenshot, allegali

La segnalazione la leggono **solo l'admin e i moderatori**. Puoi firmarla o mandarla **in forma anonima**: anche così, le nostre risposte arrivano a te.

Se è un'emergenza durante una giocata, avvisa subito l'arbitro o il team leader.$zd$, $zd$scudo$zd$, 'A_SCELTA'::"FirmaSegnalazione", 'TUTTI'::"DestinatariSondaggio", true, 10, a.id
FROM (SELECT COALESCE(
    (SELECT "creataDaId" FROM "Bacheca" ORDER BY "creataIl" ASC LIMIT 1),
    (SELECT "id" FROM "User" WHERE 'ADMIN'::"Role" = ANY("roles") ORDER BY "createdAt" ASC LIMIT 1)
  ) AS id) a
WHERE a.id IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CanaleSegnalazioni" ("id", "titolo", "descrizione", "icona", "firma", "pubblico", "conAllegati", "ordine", "creatoDaId")
SELECT $zd$zd-canale-tornei$zd$, $zd$Tornei ed eventi$zd$, $zd$Hai visto un **torneo**, una **milsim** o una giocata di un'altra squadra a cui vorresti andare? Segnalalo qui.

- nome dell'evento, **data** e **luogo**
- link o locandina: allegala
- costo e posti disponibili, se li conosci

Se c'è interesse, ne facciamo un **sondaggio** per vedere chi viene.$zd$, $zd$calendario$zd$, 'NOMINALE'::"FirmaSegnalazione", 'SQUADRA'::"DestinatariSondaggio", true, 11, a.id
FROM (SELECT COALESCE(
    (SELECT "creataDaId" FROM "Bacheca" ORDER BY "creataIl" ASC LIMIT 1),
    (SELECT "id" FROM "User" WHERE 'ADMIN'::"Role" = ANY("roles") ORDER BY "createdAt" ASC LIMIT 1)
  ) AS id) a
WHERE a.id IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CanaleSegnalazioni" ("id", "titolo", "descrizione", "icona", "firma", "pubblico", "conAllegati", "ordine", "creatoDaId")
SELECT $zd$zd-canale-sito$zd$, $zd$Problemi con il sito$zd$, $zd$Qualcosa **non funziona** o **non si capisce** nel gestionale? Raccontalo qui.

- cosa stavi facendo e **in quale pagina**
- cosa ti aspettavi e cosa è successo invece
- da **telefono** o da **computer**
- uno **screenshot** aiuta moltissimo: allegalo

Vanno bene anche i dubbi su come si usa una funzione.$zd$, $zd$chiave$zd$, 'NOMINALE'::"FirmaSegnalazione", 'SQUADRA'::"DestinatariSondaggio", true, 12, a.id
FROM (SELECT COALESCE(
    (SELECT "creataDaId" FROM "Bacheca" ORDER BY "creataIl" ASC LIMIT 1),
    (SELECT "id" FROM "User" WHERE 'ADMIN'::"Role" = ANY("roles") ORDER BY "createdAt" ASC LIMIT 1)
  ) AS id) a
WHERE a.id IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CanaleSegnalazioni" ("id", "titolo", "descrizione", "icona", "firma", "pubblico", "conAllegati", "ordine", "creatoDaId")
SELECT $zd$zd-canale-idee$zd$, $zd$Idee e feedback$zd$, $zd$Un'idea per la squadra, uno scenario, una regola da cambiare, un commento su una giocata: scrivilo qui.

- cosa proponi e **perché**
- se riguarda una giocata, **quale**

Le idee migliori diventano **sondaggi** per tutta la squadra. Puoi firmarla o mandarla in forma anonima.$zd$, $zd$miPiace$zd$, 'A_SCELTA'::"FirmaSegnalazione", 'SQUADRA'::"DestinatariSondaggio", false, 13, a.id
FROM (SELECT COALESCE(
    (SELECT "creataDaId" FROM "Bacheca" ORDER BY "creataIl" ASC LIMIT 1),
    (SELECT "id" FROM "User" WHERE 'ADMIN'::"Role" = ANY("roles") ORDER BY "createdAt" ASC LIMIT 1)
  ) AS id) a
WHERE a.id IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CanaleSegnalazioni" ("id", "titolo", "descrizione", "icona", "firma", "pubblico", "conAllegati", "ordine", "creatoDaId")
SELECT $zd$zd-canale-nuovi$zd$, $zd$Dubbi e feedback$zd$, $zd$Sei qui da poco e hai un **dubbio**? Qualcosa non era chiaro alla prima giocata, o vuoi dirci com'è andata? Scrivici qui.

- regole, attrezzatura, come funzionano le giocate, come ci si segna
- com'è stata l'accoglienza, cosa possiamo fare meglio

Non esistono domande stupide. Puoi scrivere col tuo nome o **in forma anonima**: la risposta arriva comunque a te.$zd$, $zd$nuovi$zd$, 'A_SCELTA'::"FirmaSegnalazione", 'NUOVI'::"DestinatariSondaggio", false, 14, a.id
FROM (SELECT COALESCE(
    (SELECT "creataDaId" FROM "Bacheca" ORDER BY "creataIl" ASC LIMIT 1),
    (SELECT "id" FROM "User" WHERE 'ADMIN'::"Role" = ANY("roles") ORDER BY "createdAt" ASC LIMIT 1)
  ) AS id) a
WHERE a.id IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "MessaggioBacheca" ("id", "bachecaId", "autoreId", "titolo", "testo")
SELECT $zd$zd-annuncio-segnalazioni-novita$zd$, b.id, b."creataDaId", $zd$Novità: arrivano le Segnalazioni$zd$, $zd$Nel menu c'è un gruppo nuovo: **Segnalazioni**. È il posto per raccontare qualcosa direttamente a chi gestisce il club, senza passare dai gruppi WhatsApp.

## Come funziona

- scegli il **canale** giusto e scrivi titolo e testo
- dove il canale lo permette, puoi allegare **foto o screenshot**
- puoi **firmarla** o, nei canali che lo prevedono, mandarla **in forma anonima**: il nome non lo vede nessuno, nemmeno l'admin, ma le risposte arrivano a te
- ricevi una **notifica** quando ti rispondiamo, e ritrovi tutto in «Tutte le segnalazioni», con lo storico

## I canali

- [Comportamenti scorretti](https://ops.zerodarkteam.it/segnalazioni/canale/zd-canale-comportamenti), per tutti
- [Tornei ed eventi](https://ops.zerodarkteam.it/segnalazioni/canale/zd-canale-tornei), per la squadra
- [Problemi con il sito](https://ops.zerodarkteam.it/segnalazioni/canale/zd-canale-sito), per la squadra
- [Idee e feedback](https://ops.zerodarkteam.it/segnalazioni/canale/zd-canale-idee), per la squadra
- [Dubbi e feedback](https://ops.zerodarkteam.it/segnalazioni/canale/zd-canale-nuovi), per chi è arrivato da poco

Ognuno vede i canali rivolti a lui. Le segnalazioni le leggono **solo l'admin e i moderatori**.$zd$
FROM "Bacheca" b
WHERE b."pubblico" = 'TUTTI'
ORDER BY (b.nome ILIKE '%novit%' OR b.nome ILIKE '%avvis%') DESC, b."ordine" ASC, b."creataIl" ASC
LIMIT 1
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "MessaggioBacheca" ("id", "bachecaId", "autoreId", "titolo", "testo")
SELECT $zd$zd-annuncio-welcome$zd$, b.id, b."creataDaId", $zd$Benvenuti in Zero Dark!$zd$, $zd$Se stai leggendo, hai fatto il primo passo per giocare con noi. Qualche indicazione per partire:

- nel **Calendario** trovi le giocate aperte: rispondi *Ci sono* per farci sapere che vieni
- negli **Annunci** trovi le comunicazioni del club: tienili d'occhio
- quando il sito te lo chiede, **accetta le notifiche**: così non ti perdi niente
- in campo segui sempre le indicazioni sulla **sicurezza**, a partire dalla protezione degli occhi

## Hai un dubbio?

Nel menu, sotto **Segnalazioni**, c'è il canale [Dubbi e feedback](https://ops.zerodarkteam.it/segnalazioni/canale/zd-canale-nuovi): chiedi quello che vuoi, anche in forma anonima. Ti risponde direttamente chi gestisce il club.

Ci vediamo in campo!$zd$
FROM "Bacheca" b
WHERE b."pubblico" IN ('NUOVI', 'TUTTI') OR b.nome ILIKE '%welcome%' OR b.nome ILIKE '%benvenut%'
ORDER BY (b.nome ILIKE '%welcome%' OR b.nome ILIKE '%benvenut%') DESC, (b."pubblico" = 'NUOVI') DESC, b."ordine" ASC, b."creataIl" ASC
LIMIT 1
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "MessaggioBacheca" ("id", "bachecaId", "autoreId", "titolo", "testo")
SELECT $zd$zd-annuncio-interno$zd$, b.id, b."creataDaId", $zd$Segnalazioni: come le usiamo$zd$, $zd$Da oggi nel menu trovate **Segnalazioni**. Serve a portare le cose nel posto giusto, invece che nelle chat di gruppo.

## I canali per la squadra

- [Comportamenti scorretti](https://ops.zerodarkteam.it/segnalazioni/canale/zd-canale-comportamenti): se in campo o fuori qualcosa non va, anche nei vostri confronti. Si può scrivere in forma anonima
- [Tornei ed eventi](https://ops.zerodarkteam.it/segnalazioni/canale/zd-canale-tornei): i tornei e le giocate esterne a cui vorreste andare
- [Problemi con il sito](https://ops.zerodarkteam.it/segnalazioni/canale/zd-canale-sito): qualcosa non funziona o non si capisce. Dite in che pagina e allegate uno screenshot
- [Idee e feedback](https://ops.zerodarkteam.it/segnalazioni/canale/zd-canale-idee): proposte su scenari, regole, organizzazione. Le migliori diventano sondaggi

## Qualche regola

- le segnalazioni le leggono **solo l'admin e i moderatori**, e le risposte arrivano con una notifica
- l'anonimato è vero: **nemmeno l'admin** vede chi ha scritto. Usatelo con rispetto
- le questioni sulle persone si affrontano qui, **non nei gruppi WhatsApp**

Grazie a tutti: più ci raccontate, meglio funziona la squadra.$zd$
FROM "Bacheca" b
WHERE b."pubblico" = 'SQUADRA'
ORDER BY (b.nome ILIKE '%zero dark%' OR b.nome ILIKE '%team%' OR b.nome ILIKE '%squadra%') DESC, b."ordine" ASC, b."creataIl" ASC
LIMIT 1
ON CONFLICT ("id") DO NOTHING;
