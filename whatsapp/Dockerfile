FROM node:22-alpine

WORKDIR /app

# Baileys tira una sua dipendenza direttamente da un repository git: senza git
# installato, npm si ferma con un enoent che non dice cosa manca.
# tzdata perche' senza di lui TZ non ha effetto: gli auguri partirebbero
# sull'orario di Greenwich, e il promemoria del giorno prima anche.
RUN apk add --no-cache git tzdata

COPY package.json ./
RUN npm install --no-audit --no-fund --omit=dev

COPY index.mjs ./

# la sessione vive qui e va su un volume: senza, il codice andrebbe
# riscansionato col telefono a ogni riavvio del container
RUN mkdir -p /dati/sessione
ENV PORTA=3001

EXPOSE 3001
CMD ["node", "index.mjs"]
