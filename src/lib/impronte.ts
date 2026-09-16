import { createHmac } from 'node:crypto';

/**
 * Le impronte di chi è stato respinto all'ingresso.
 *
 * Servono a una cosa sola: riconoscere chi ritenta, senza tenersi i dati di
 * qualcuno che non è mai entrato. Non sono un semplice hash — c'è di mezzo la
 * chiave di questa installazione, altrimenti chi mettesse le mani sul
 * database potrebbe provare gli indirizzi email uno per uno finché non trova
 * quello che combacia. Con la chiave dentro, senza la chiave non si prova
 * niente.
 *
 * Sono due perché uno solo si aggira: chi è stato respinto e ci riprova con
 * un'altra email resta lo stesso nome, cognome e data di nascita.
 */

function chiave(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET mancante o troppo corta: non posso calcolare le impronte.');
  }
  return s;
}

const impronta = (valore: string) => createHmac('sha256', chiave()).update(valore).digest('hex');

/**
 * Minuscolo, senza accenti, spazi di troppo buttati via: «De Luca», «de luca»
 * e «De  Lucà» devono lasciare la stessa impronta, o basterebbe una maiuscola
 * per non essere riconosciuti.
 */
const normalizza = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const improntaEmail = (email: string) => impronta(`email:${normalizza(email)}`);

export const improntaIdentita = (
  nome: string,
  cognome: string,
  dataNascita: Date | null,
) =>
  impronta(
    `identita:${normalizza(nome)}|${normalizza(cognome)}|` +
      (dataNascita ? dataNascita.toISOString().slice(0, 10) : ''),
  );
