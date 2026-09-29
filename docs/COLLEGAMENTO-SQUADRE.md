# Collegamento fra gestionali di squadre diverse

Deciso il 29 settembre 2026. Ipotesi di partenza: **tutti i gestionali hanno la
stessa versione**.

## Perché

Oggi, quando organizziamo un evento e invitiamo un'altra squadra, le mandiamo un
link: loro scrivono a mano quanti operatori portano, e a ogni cambio di ritrovo,
book o collegamento qualcuno deve riscriverglielo. Se anche l'altra squadra usa
questo gestionale, le presenze le gestisce già: i due gestionali possono
parlarsi da soli, e i numeri, i book e le modifiche passano senza nessuno in
mezzo.

## Chi è chi

- **Ogni gestionale ha un'identità**: un indirizzo (es. `https://ops.zerodarkteam.it`)
  e una coppia di chiavi generata alla prima partenza. Tutto quello che due
  gestionali collegati si mandano viaggia da server a server in HTTPS ed è
  **firmato**: nessuno può fingersi l'altra squadra.
- **La mia squadra** è la pagina con il profilo della nostra squadra: nome, logo,
  motto, città, sito, recapiti della società, referenti (callsign e contatti).
  È solo quello che la squadra sceglie di mostrare, ed è l'unica cosa che si
  scambia col collegamento. Nome e logo sono anche quelli del gestionale
  (intestazione, app installata).

## Il collegamento

1. In *La mia squadra* → **Condividi il profilo**: un link e il suo QR code.
   Scadono dopo 7 giorni e si possono revocare.
2. Chi lo riceve lo apre (la pagina chiede qual è il suo gestionale e lo
   porta lì) oppure lo incolla nel proprio gestionale.
3. Nel proprio gestionale sceglie se la squadra va **collegata a una esistente**
   dell'anagrafica squadre o **creata nuova**. Parte la richiesta.
4. Dall'altra parte la richiesta compare in **Richieste di collegamento**.
   Accettata, i due gestionali si scambiano i profili e sulla squadra compare
   l'icona del collegamento. I cambi di profilo si propagano da soli.
5. **Scollega**, da tutte e due le parti: da lì non passa più niente. Gli eventi
   condivisi già accettati **restano, congelati**, con l'avviso che non sono più
   aggiornati; adesioni e quote locali non si perdono. I nuovi non arrivano più.

## Gli eventi condivisi

- L'evento vero vive **nel gestionale di chi organizza**. Le squadre invitate ne
  hanno una copia sincronizzata, così da loro adesioni, formazioni, quote e
  polizze funzionano come per ogni altro evento.
- Invitando una squadra collegata si sceglie l'accesso:
  - **Gestione**: chi ha i diritti sul calendario dell'altra squadra può
    modificare l'evento — collegamenti, ritrovo e il resto. La modifica passa
    dall'organizzatore, che la applica e la rimanda a tutti.
  - **Visualizzazione**: lo vedono e basta, come col link di oggi.
  - **Può invitare altre squadre**: di partenza no.
- Dall'altra parte l'evento arriva nello stato **INVITATO**, simile alla bozza:
  lo vede solo chi gestisce il calendario, e lo **accetta**, lo **rifiuta** o lo
  lascia lì. Accettato diventa una bozza normale, e si rilascia quando si vuole.
- **Cosa passa**: titolo, descrizione, date, campo, ritrovo, collegamenti,
  allegati e book, costo per le squadre ospiti; i referenti **solo come callsign
  e recapiti**. **Mai** nomi, adesioni dei singoli o quote interne.
- **Chi organizza si vede sempre**: badge con logo e nome della squadra
  organizzatrice sulle card del calendario, nella programmazione e dentro
  l'evento.
- **Re-invito**: se una squadra invitata può invitarne altre, la terza deve
  essere collegata **anche all'organizzatore**. La proposta passa
  dall'organizzatore; se non c'è ancora il collegamento parte la richiesta.

## Numeri e presenze

- Ogni squadra manda all'organizzatore **i propri presenti**, appena cambiano.
  I **«forse»** li manda solo se lo decide lei, **evento per evento** (di
  partenza no).
- I numeri li vedono tutti: sulla scheda dell'evento, il riepilogo per squadra e
  il totale.

## I costi

- Ogni squadra fa pagare ai suoi la quota che vuole, come oggi.
- L'organizzatore può chiedere alle squadre ospiti un **costo per operatore**
  (es. 5 €) o **per l'intera squadra**. Il dovuto è **cumulativo**: 10 presenti ×
  5 € = 50 €, che la squadra ospite paga all'organizzazione con i metodi di
  pagamento che l'organizzatore ha già configurati.

## Quando un gestionale è spento

I messaggi aspettano in una coda e si ritentano: non si perde niente.

## Ordine di lavoro

1. *La mia squadra* e marchio configurabile; ambiente **test2**
   (`test2.zerodarkteam.it`, squadra e logo fittizi) per provare il
   collegamento senza toccare la produzione.
2. Collegamento: link e QR, richieste, accetta, profilo, scollega.
3. Eventi invitati: stato INVITATO, accetta/rifiuta, sincronizzazione, badge.
4. Presenze automatiche e costi per le squadre ospiti.
5. Gestione condivisa e re-inviti.

Ogni fase si prova fra `test` e `test2` prima della successiva.

Nota per la fase 2: davanti ai due test c'è la password del proxy. Le rotte con
cui i gestionali si parlano (`/api/federazione/…`) devono restarne fuori: si
difendono da sole con le firme.
