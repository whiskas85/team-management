FROM node:22-alpine

WORKDIR /app

# Baileys tira una sua dipendenza direttamente da un repository git: senza git
# installato, npm si ferma con un enoent che non dice cosa manca
RUN apk add --no-cache git

COPY package.json ./
RUN npm install --no-audit --no-fund --omit=dev

COPY index.mjs ./

# la sessione vive qui e va su un volume: senza, il codice andrebbe
# riscansionato col telefono a ogni riavvio del container
RUN mkdir -p /dati/sessione
ENV PORTA=3001

EXPOSE 3001
CMD ["node", "index.mjs"]
