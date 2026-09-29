import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  chiediIdentita,
  identita,
  leggiArrivato,
  profiloNostro,
  profiloRicevuto,
} from '@/lib/federazione';

export const dynamic = 'force-dynamic';

const no = (errore: string, status = 400) => NextResponse.json({ errore }, { status });

/**
 * Un'altra squadra ha aperto un nostro link di collegamento e ci chiede di
 * collegarci. Finisce fra le richieste di collegamento: decide un admin.
 *
 * Tre controlli prima di crederci: il link è nostro e vale ancora; il
 * messaggio è firmato con la chiave che il mittente ci manda; e quella chiave
 * è davvero del gestionale all'indirizzo che dice — glielo richiediamo noi,
 * a quell'indirizzo, così nessuno può chiedere il collegamento a nome d'altri.
 */
export async function POST(req: Request) {
  const a = await leggiArrivato(req, 'richiesta');
  if (!a.ok) return no(a.errore);
  const { da, corpo, firmatoDa } = a.dati;

  const token = typeof corpo.token === 'string' ? corpo.token : '';
  const link = token ? await prisma.linkCollegamento.findUnique({ where: { token } }) : null;
  if (!link || link.revocatoIl || link.scadeIl < new Date()) {
    return no('Il link di collegamento non vale più: chiedine uno nuovo.', 410);
  }

  const chiave = typeof corpo.chiavePubblica === 'string' ? corpo.chiavePubblica : '';
  if (!chiave || !firmatoDa(chiave)) return no('Firma non valida.', 401);
  const io = await identita();
  if (da === io.indirizzo) return no('Questo è il gestionale stesso: non ci si collega a sé.');

  const loro = await chiediIdentita(da);
  if (!loro.ok || loro.dati.chiavePubblica !== chiave || loro.dati.indirizzo !== da) {
    return no('Il gestionale che chiede non è quello che dice di essere.', 401);
  }
  const profilo = profiloRicevuto(corpo.profilo) ?? loro.dati.profilo;

  const esistente = await prisma.collegamentoSquadra.findUnique({ where: { indirizzo: da } });
  if (esistente?.stato === 'ATTIVO' && esistente.chiavePubblica === chiave) {
    return NextResponse.json({ stato: 'ATTIVO', profilo: await profiloNostro() });
  }
  const dati = {
    chiavePubblica: chiave,
    stato: 'DA_ACCETTARE' as const,
    profilo: profilo as unknown as Prisma.InputJsonValue,
    richiestoIl: new Date(),
    chiusoIl: null,
    decisoDa: null,
  };
  await prisma.$transaction([
    prisma.collegamentoSquadra.upsert({
      where: { indirizzo: da },
      create: { indirizzo: da, ...dati },
      update: dati,
    }),
    prisma.linkCollegamento.update({ where: { id: link.id }, data: { usato: { increment: 1 } } }),
  ]);
  return NextResponse.json({ stato: 'DA_ACCETTARE', profilo: await profiloNostro() });
}
