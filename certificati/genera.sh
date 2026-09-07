#!/bin/sh
# Certificato per servire il gestionale in HTTPS sulla rete ZeroTier.
#
# È firmato da noi stessi: nessuna autorità al mondo può certificare un
# indirizzo privato come 10.x.x.x, quindi il browser avviserà comunque. Serve a
# cifrare il traffico — password comprese — non a dimostrare a un estraneo chi
# siamo: quello lo sa già chi è nella rete.
#
# Gli indirizzi stanno tutti dentro un certificato solo: si raggiunge il
# gestionale da ZeroTier, dal Wi-Fi di casa o dalla macchina stessa senza
# doverne rifare uno ogni volta.

set -e
cd "$(dirname "$0")"

GIORNI=${GIORNI:-825}

cat > openssl.cnf <<CFG
[req]
distinguished_name = dn
x509_extensions = v3
prompt = no

[dn]
CN = Zero Dark Team - Gestionale
O = Zero Dark Team

[v3]
subjectAltName = @nomi
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[nomi]
DNS.1 = localhost
DNS.2 = zerodark.local
IP.1 = 127.0.0.1
IP.2 = 10.110.227.76
IP.3 = 10.147.19.76
IP.4 = 192.168.86.60
CFG

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout chiave.pem -out certificato.pem \
  -days "$GIORNI" -config openssl.cnf

echo
echo "Certificato pronto, valido $GIORNI giorni."
openssl x509 -in certificato.pem -noout -dates -ext subjectAltName
