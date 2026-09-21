import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { registraVoto } from '@/lib/sondaggi';

/**
 * Rispondere a un sondaggio dai pulsanti della notifica.
 *
 * La chiama il service worker col gestionale chiuso, quando qualcuno preme
 * «ci sono» sulla notifica che gli è arrivata sul telefono. Serve a togliere
 * di mezzo i trenta secondi fra la domanda e la risposta: aprire
 * l'applicazione, aspettare, cercare il pulsante. In quei trenta secondi si
 * decide di rispondere dopo, e dopo vuol dire mai.
 *
 * **Chi vota lo dice il cookie di sessione**, non il messaggio che arriva. Il
 * push viaggia verso un dispositivo, e se bastasse il dispositivo a votare
 * basterebbe avere in mano il telefono di un altro. Il cookie è `SameSite=Lax`
 * e questo è un POST: un altro sito non può farlo partire di nascosto.
 *
 * Le regole — ti riguarda, è ancora aperto, quante risposte puoi dare — non
 * sono scritte qui: stanno in `lib/sondaggi` insieme a quelle del form, perché
 * due porte sulla stessa stanza devono avere la stessa serratura.
 */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  // Niente sessione: il service worker se ne accorge e apre la pagina, dove si
  // fa l'accesso e si risponde come sempre. Inventarsi chi sia non si fa.
  if (!me) return NextResponse.json({ errore: 'Sessione scaduta.' }, { status: 401 });

  let corpo: { sondaggioId?: unknown; opzioneId?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ errore: 'Richiesta malformata.' }, { status: 400 });
  }

  const sondaggioId = typeof corpo.sondaggioId === 'string' ? corpo.sondaggioId : '';
  const opzioneId = typeof corpo.opzioneId === 'string' ? corpo.opzioneId : '';
  if (!sondaggioId || !opzioneId) {
    return NextResponse.json({ errore: 'Richiesta incompleta.' }, { status: 400 });
  }

  const esito = await registraVoto(me, sondaggioId, [opzioneId]);
  if (!esito.ok) return NextResponse.json({ errore: esito.errore }, { status: 409 });

  // Chi ha l'elenco aperto su un'altra scheda deve vedere il conto nuovo.
  revalidatePath('/sondaggi');
  revalidatePath(`/sondaggi/${sondaggioId}`);

  return NextResponse.json({
    ok: true,
    testo: 'Puoi cambiarla dal gestionale finché il sondaggio è aperto.',
  });
}
