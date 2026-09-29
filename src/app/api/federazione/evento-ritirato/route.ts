import { NextResponse } from 'next/server';
import { mittente } from '@/lib/federazione';
import { riceviRitiro } from '@/lib/eventi-condivisi';

export const dynamic = 'force-dynamic';

/** L'organizzatore ha tolto l'invito, o ha eliminato l'attività. */
export async function POST(req: Request) {
  const m = await mittente(req, 'evento-ritirato');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const id = typeof m.dati.corpo.id === 'string' ? m.dati.corpo.id : '';
  if (id) await riceviRitiro(m.dati.collegamento, id);
  return NextResponse.json({ ok: true });
}
