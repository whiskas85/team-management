import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { chiediIdentita, leggiArrivato, normalizzaIndirizzo } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

/**
 * Un gestionale collegato ha cambiato indirizzo: «sono io, prima stavo a A, ora
 * sto a B».
 *
 * Il mittente si riconosce dal vecchio indirizzo, e la firma deve essere della
 * chiave che conosciamo per lui: le chiavi non cambiano col dominio. Poi si
 * bussa al nuovo indirizzo e si controlla che risponda con la stessa chiave —
 * un trasloco verso un posto che non è suo non si accetta. Fatto questo, il
 * collegamento cambia indirizzo e resta com'era.
 */
export async function POST(req: Request) {
  const a = await leggiArrivato(req, 'trasloco');
  if (!a.ok) return NextResponse.json({ errore: a.errore }, { status: 401 });
  const vecchio = normalizzaIndirizzo(String(a.dati.corpo.vecchio ?? ''));
  const nuovo = normalizzaIndirizzo(String(a.dati.corpo.nuovo ?? ''));
  if (!vecchio || !nuovo || nuovo !== a.dati.da) {
    return NextResponse.json({ errore: 'trasloco senza indirizzi validi' }, { status: 400 });
  }

  // già fatto: un messaggio ritentato, o arrivato due volte
  const gia = await prisma.collegamentoSquadra.findUnique({ where: { indirizzo: nuovo } });
  if (gia && a.dati.firmatoDa(gia.chiavePubblica)) return NextResponse.json({ ok: true });
  if (gia) return NextResponse.json({ errore: 'quell’indirizzo è già di un altro' }, { status: 409 });

  const c = await prisma.collegamentoSquadra.findUnique({ where: { indirizzo: vecchio } });
  if (!c || !a.dati.firmatoDa(c.chiavePubblica)) {
    return NextResponse.json({ errore: 'non ci conosciamo' }, { status: 401 });
  }

  const la = await chiediIdentita(nuovo);
  if (!la.ok) return NextResponse.json({ errore: `il nuovo indirizzo ${la.errore}` }, { status: 502 });
  // la stessa chiave: a meno di spazi e a capo ai bordi del PEM
  if (la.dati.chiavePubblica.trim() !== c.chiavePubblica.trim() || la.dati.indirizzo !== nuovo) {
    return NextResponse.json({ errore: 'al nuovo indirizzo risponde un altro gestionale' }, { status: 409 });
  }

  await prisma.collegamentoSquadra.update({
    where: { id: c.id },
    data: { indirizzo: nuovo, profilo: la.dati.profilo },
  });
  console.log(`[federazione] ${vecchio} ora sta a ${nuovo}`);
  return NextResponse.json({ ok: true });
}
