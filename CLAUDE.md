# Regole del progetto

Indicazioni fisse di chi gestisce il gestionale: valgono per ogni modifica.

- **Ogni casella in cui si scrive Markdown ha la barra degli strumenti di
  formattazione.** Si usa sempre `components/EditoreMarkdown.tsx`, mai una
  `<textarea>` semplice: anche quando serve un'anteprima propria (modalità
  `controllato`, `senzaAnteprima`) o solo alcuni strumenti (`strumenti`,
  `altri`, es. `STRUMENTI_EMAIL`).
- **Le trasformazioni non toccano il testo di chi scrive.** Convertire un
  testo (Markdown → HTML, «stile della squadra», ecc.) cambia solo come si
  presenta: dentro, niente parole aggiunte, tolte o spostate. Quello che si
  vuole in più dentro il testo (un pulsante) lo inserisce chi scrive, con un
  comando apposta.
- **La cornice non si scrive mai dentro il testo.** Lo «stile della squadra»
  (nome in cima, firma con logo, nome e motto, riga «email automatica, non
  rispondere») è un'impostazione (`stileSquadra`): il Markdown salvato resta
  quello scritto, e la cornice la mette `componiCorpo` quando compone l'HTML
  (anteprima e invio). Così riapplicarla non accumula intestazioni.
- **Gli errori dei moduli si vedono:** `FormAzione` porta l'errore in vista;
  un modulo che «non salva» senza dire perché è un bug.
