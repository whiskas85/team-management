import { NextResponse } from 'next/server';
import { mittente } from '@/lib/federazione';
import { salvaProfiloRicevuto } from '@/lib/federazione-coda';

export const dynamic = 'force-dynamic';

/** Una squadra collegata ha cambiato il suo profilo (nome, logo, referenti…). */
export async function POST(req: Request) {
  const m = await mittente(req, 'profilo');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  if (m.dati.collegamento.stato !== 'ATTIVO') {
    return NextResponse.json({ errore: 'Il collegamento non è attivo.' }, { status: 409 });
  }
  await salvaProfiloRicevuto(m.dati.collegamento, m.dati.corpo.profilo);
  return NextResponse.json({ ok: true });
}
