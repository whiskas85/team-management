#!/bin/sh
#
# La sveglia dei lavori automatici.
#
# La chiama il cron della macchina ogni pochi minuti e bussa a /api/lavori, che
# guarda se c'e' qualcosa da fare adesso: oggi le polizze giornaliere da
# attivare poco prima dell'attivita'.
#
# Sta qui, nel repository, e non scritta a mano nel crontab: cosi' la si legge,
# la si corregge e la si ritrova dopo una reinstallazione. Nel crontab resta una
# riga sola che la chiama.
#
#   */5 * * * * /opt/gestionale/deploy/lavori.sh
#
# **Il segreto non e' qui dentro.** Si legge da .env.prod, che sta sulla
# macchina con i permessi 600 e fuori dal repository. Senza, lo script esce
# senza fare niente e senza lamentarsi: e' la condizione normale di un ambiente
# dove i lavori automatici non si vogliono.

CARTELLA=/opt/gestionale
REGISTRO=/var/log/zd-lavori.log

cd "$CARTELLA" || exit 0

SEGRETO=$(grep '^SEGRETO_LAVORI=' .env.prod 2>/dev/null | cut -d= -f2-)
[ -n "$SEGRETO" ] || exit 0

DOMINIO=$(grep '^DOMINIO=' .env.prod 2>/dev/null | cut -d= -f2-)
[ -n "$DOMINIO" ] || exit 0

RISPOSTA=$(curl -fsS --max-time 120 -X POST \
  -H "x-segreto-lavori: $SEGRETO" \
  "https://$DOMINIO/api/lavori" 2>&1)
ESITO=$?

# Si scrive solo quando c'e' qualcosa da raccontare: un giro a vuoto — ed e' la
# quasi totalita' — non lascia una riga, altrimenti il registro diventa
# illeggibile proprio il giorno che serve.
case "$RISPOSTA" in
  *'"spento":true'*) exit 0 ;;
  *'"fatte":0,"rifiutate":[],"inAttesa":0'*) exit 0 ;;
esac

echo "$(date '+%F %T') esito=$ESITO $RISPOSTA" >> "$REGISTRO"

# il registro non cresce all'infinito: restano le ultime mille righe
if [ "$(wc -l < "$REGISTRO" 2>/dev/null || echo 0)" -gt 1000 ]; then
  tail -n 500 "$REGISTRO" > "$REGISTRO.tmp" && mv "$REGISTRO.tmp" "$REGISTRO"
fi
