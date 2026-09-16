import { NextResponse } from 'next/server';
import { chiavePubblica } from '@/lib/push';

/**
 * La chiave pubblica con cui il browser si iscrive.
 *
 * Arriva da qui e non da una variabile `NEXT_PUBLIC_*` per una ragione
 * pratica: quelle vengono murate dentro al pacchetto quando si costruisce
 * l'immagine, e l'immagine è la stessa per test e produzione. Chiedendola al
 * server, ogni ambiente dà la sua senza ricostruire niente.
 */
export async function GET() {
  const chiave = chiavePubblica();
  if (!chiave) return NextResponse.json({ errore: 'Notifiche non configurate.' }, { status: 503 });
  return NextResponse.json({ chiave });
}
