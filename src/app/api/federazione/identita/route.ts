import { NextResponse } from 'next/server';
import { identita, profiloNostro, PROTOCOLLO } from '@/lib/federazione';

export const dynamic = 'force-dynamic';

/**
 * Chi siamo, per un altro gestionale: indirizzo, chiave pubblica, profilo.
 * È pubblica apposta: chi apre un nostro link di collegamento la legge per
 * sapere a chi sta chiedendo, e chi riceve una richiesta la rilegge per
 * controllare che il mittente sia davvero chi dice.
 */
export async function GET() {
  try {
    const io = await identita();
    return NextResponse.json({
      protocollo: PROTOCOLLO,
      indirizzo: io.indirizzo,
      chiavePubblica: io.chiavePubblica,
      profilo: await profiloNostro(),
    });
  } catch (e) {
    return NextResponse.json({ errore: (e as Error).message }, { status: 503 });
  }
}
