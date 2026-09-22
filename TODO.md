# Da fare: OPS vendibile ad altre squadre

Deciso il 22 settembre 2026, **da non fare adesso**. Oggi il gestionale è
cucito addosso a Zero Dark: il nome, il logo, i colori e alcuni testi sono
scritti nel codice. Per poterlo dare a un'altra squadra, tutto quello che è
«di Zero Dark» deve diventare **configurazione**, e le configurazioni stanno
**in una pagina apposta** del gestionale, riservata all'admin.

Il sito pubblico della squadra non si vende: vive nel suo repository
(`whiskas85/zerodarkteam-site`) e resta com'è.

## 1. Una pagina «Configurazione»

Una sola pagina per l'admin, con le sezioni qui sotto. I valori vanno nel
database (una riga di impostazioni, come `Impostazioni` oggi), non nei file:
chi installa il gestionale per un'altra squadra non deve toccare il codice.

## 2. I nomi: controllo fatto il 22/09/2026

Occorrenze trovate fuori dal sito: «Zero Dark Team» 17, «zerodark» 14,
«Zero Dark Ops» 13, «Zero Dark» 11, «SAT & Gaming» 7, «zerodarkteam» 6,
«ZERO DARK OPS» 5, «ZeroDark» 3, «Going dark» 5.

Da rendere configurabili (nome della squadra, nome del gestionale, motto,
associazione di riferimento):

- intestazione e marchio: `src/components/Nav.tsx`, `src/components/Logo.tsx`
- titolo, descrizione e icone dell'app installata: `src/app/layout.tsx`,
  `src/app/manifest.ts`, `public/sw.js` (titolo di ripiego delle notifiche)
- pagina di accesso e accessi rapidi del test: `src/app/login/page.tsx`
  (le email `@zerodark.team` delle figure di prova)
- messaggi WhatsApp e testi composti: `src/lib/messaggi.ts`,
  `src/lib/messaggio-accesso.ts`, `src/lib/assicurazione.ts`,
  `src/actions/assicurazione.ts`
- pagine per gli ospiti e per chi entra con un link: `src/app/invito/**`,
  `src/app/accesso/[gettone]/page.tsx`
- privacy ed esportazione dati: `src/lib/gdpr.ts`,
  `src/app/api/gdpr/esporta/route.ts` (titolare del trattamento)
- assistente: `src/app/api/mcp/route.ts` (nome del server MCP e istruzioni)
- errori e varie: `src/app/global-error.tsx`, `src/actions/eventi.ts`,
  `src/actions/mappe.ts`, `src/actions/sondaggi.ts`, `src/lib/lavori.ts`,
  `src/app/(app)/calendario/[id]/page.tsx`, `src/app/(app)/admin/contatti/page.tsx`
  (testo del WhatsApp al contatto)
- dati iniziali: `prisma/seed.mjs`, `prisma/migrations/20260923_admin_iniziale`
  (l'admin iniziale e la sua email)
- mittente delle notifiche: `src/lib/push.ts` (`presidente@zerodarkteam.it`
  come ripiego di `VAPID_SUBJECT`)

Il logo (`public/logo.jpg` e le icone `public/icona-*`) va caricato dalla
pagina di configurazione, non sostituito a mano nei file.

## 3. Il tema: modificabile, con un tema neutro di prova

Oggi i colori sono fissi: il verde del visore (`#4cff00`) in
`tailwind.config.ts` e in `src/app/globals.css`, più il tricolore.

- I colori del tema diventano **variabili CSS** lette da `tailwind.config.ts`
  (`nvg`, `nvgdim`, `bg`, `surface`, `line`, `ink`, `muted`, `warn`, `danger`),
  così un tema si cambia senza ricompilare.
- Dalla pagina di configurazione si sceglie il tema, o si modificano i singoli
  colori con un'anteprima.
- **Un tema neutro** di prova (grigio e blu, niente verde militare) per
  verificare che nessun pezzo dell'interfaccia abbia ancora un colore scritto a
  mano: se qualcosa resta verde col tema neutro, è un colore da sistemare.
- Attenzione al contrasto: il testo sui pulsanti oggi è nero su verde acceso;
  con un colore scuro deve diventare chiaro da solo.

## 4. I portali federali: configurabili

Il portale FIGT/ASNWG va benissimo così — lo usano anche altre squadre — ma
va reso **uno dei portali possibili**, scelto dalla configurazione, invece di
essere l'unico scritto nel codice.

- oggi: `src/lib/figt.ts` (lettura del portale, polizze giornaliere,
  anagrafiche), `src/actions/figt.ts`, `src/actions/tessere.ts`,
  `src/lib/assicurazione.ts`, `src/actions/assicurazione.ts`, e riferimenti in
  `src/lib/domain.ts`, `src/actions/iscrizioni.ts`, `src/actions/operatori.ts`,
  `src/actions/stagioni.ts`
- obiettivo: un'interfaccia «portale federale» (tessere, polizze, anagrafiche)
  con FIGT come prima implementazione; dalla configurazione si sceglie quale
  usare, o nessuno.

## 5. Il repository

Il repository del gestionale (`whiskas85/team-management`) oggi è
**pubblico**: chiunque può scaricare OPS. Per venderlo va reso privato,
dalle impostazioni del repository su GitHub.
