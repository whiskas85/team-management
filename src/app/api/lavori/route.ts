import { NextResponse } from 'next/server';
import { assicuraInAnticipo, avvisaCertificatiInScadenza } from '@/lib/lavori';
import { avvisaSondaggiScaduti } from '@/lib/sondaggi-chiusura';

/**
 * La porta da cui si sveglia il gestionale.
 *
 * La chiama un `cron` sulla macchina, ogni pochi minuti. Non è una pagina e
 * non la apre nessuno con il browser: si entra solo con il segreto che sta
 * nell'ambiente, e chi non ce l'ha riceve **404** — non «non autorizzato».
 * Dire «qui c'è qualcosa ma non puoi» a chi bussa a caso è già un'informazione
 * di troppo.
 *
 * È un POST apposta: un indirizzo che *fa* qualcosa non deve poter partire per
 * un link aperto per sbaglio, o per un prefetch del browser.
 *
 * Senza `SEGRETO_LAVORI` nell'ambiente la porta non esiste: in test, dove il
 * segreto non c'è, nessun lavoro parte da solo — ed è giusto così, visto che
 * attivare una polizza spenderebbe una polizza vera.
 */
export async function POST(req: Request) {
  const segreto = process.env.SEGRETO_LAVORI;
  if (!segreto || req.headers.get('x-segreto-lavori') !== segreto) {
    return new NextResponse('Non trovato', { status: 404 });
  }

  try {
    /*
     * I lavori non si fermano a vicenda.
     *
     * Sono due cose senza rapporto fra loro — le polizze da attivare e i
     * certificati che scadono — e se il portale federale fosse irraggiungibile
     * non sarebbe un buon motivo per non avvisare nessuno della sua visita
     * medica.
     */
    const [assicurazioni, certificati, sondaggi] = await Promise.allSettled([
      assicuraInAnticipo(),
      avvisaCertificatiInScadenza(),
      // i sondaggi scaduti: l'avviso con il risultato a chi li ha ricevuti
      avvisaSondaggiScaduti(),
    ]);

    const letto = <T,>(r: PromiseSettledResult<T>) =>
      r.status === 'fulfilled' ? r.value : { errore: String(r.reason) };

    return NextResponse.json({
      ok: true,
      assicurazioni: letto(assicurazioni),
      certificati: letto(certificati),
      sondaggi: letto(sondaggi),
    });
  } catch (e) {
    // il cron non legge, ma il log della macchina sì: se qualcosa si rompe qui
    // dentro deve restarne traccia da qualche parte
    console.error('[lavori]', e);
    return NextResponse.json({ ok: false, errore: (e as Error).message }, { status: 500 });
  }
}
