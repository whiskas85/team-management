import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { mancanze, qualcosaManca } from '@/lib/consensi';
import { FINALITA, TITOLARE, VERSIONE_PRIVACY } from '@/lib/gdpr';
import { Logo } from '@/components/Logo';
import { Badge } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { accettaPrivacy, accettaRegole, scegliConsensoFoto } from '@/actions/consensi';

export const dynamic = 'force-dynamic';

/**
 * Le tre domande, prima di entrare.
 *
 * Sta fuori dal gruppo (app) come il cambio password, e per la stessa ragione:
 * il controllo che porta qui vive in quel layout, e una pagina dentro allo
 * stesso gruppo si rimanderebbe a sé stessa all'infinito.
 *
 * Si passano una volta sola. Due sono obbligatorie — senza informativa non si
 * possono trattare i dati di nessuno, e senza regole lette non si prende parte
 * a un club che di regole è fatto — la terza è una scelta vera, con due
 * risposte buone.
 */
export default async function ConsensiPage() {
  const me = await requireUser();

  const utente = await prisma.user.findUniqueOrThrow({
    where: { id: me.id },
    select: {
      id: true,
      stato: true,
      privacyAccettataIl: true,
      privacyVersione: true,
      consensoImmagini: true,
      consensoImmaginiIl: true,
    },
  });

  const manca = await mancanze(utente.id);
  // chi ci arriva per curiosità torna da dove è venuto
  if (!qualcosaManca(manca)) redirect('/dashboard');

  const statuto = manca.documenti.filter((d) => d.tipo === 'STATUTO');
  const regolamenti = manca.documenti.filter((d) => d.tipo === 'REGOLAMENTO');

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo size={64} />
        <h1 className="mt-4 text-xl font-semibold">Prima di entrare</h1>
        <p className="mt-2 text-sm text-muted">
          Tre cose, una volta sola. Due servono per stare nel club, la terza è una scelta tua.
        </p>
      </div>

      <div className="space-y-4">
        {/* ------------------------------------------------ privacy */}
        <div className={`card ${manca.privacy ? 'border-l-2 border-l-warn' : 'opacity-60'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">1 · Informativa privacy</p>
            <Badge tono={manca.privacy ? 'warn' : 'ok'}>
              {manca.privacy ? 'da accettare' : 'fatto'}
            </Badge>
          </div>

          {manca.privacy && (
            <>
              <p className="mt-2 text-sm text-muted">
                Titolare del trattamento: {TITOLARE} · versione {VERSIONE_PRIVACY}. Senza questa non
                si può tenere in ordine niente: né il tesseramento, né il certificato medico, né le
                quote.
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {FINALITA.filter((f) => f.obbligatorio).map((f) => (
                  <li key={f.titolo} className="text-muted">
                    · <span className="text-ink">{f.titolo}</span> — {f.base}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                <Link href="/privacy" className="text-nvg hover:underline">
                  Leggi l’informativa per intero
                </Link>{' '}
                (si apre dentro il gestionale, poi torni qui).
              </p>
              <FormAzione azione={accettaPrivacy} className="mt-4">
                <Invia icona="approva">Ho letto e accetto l’informativa</Invia>
              </FormAzione>
            </>
          )}
        </div>

        {/* ------------------------------------------------ statuto e regolamenti */}
        {manca.documenti.length > 0 && (
          <div className={`card ${manca.regole ? 'border-l-2 border-l-warn' : 'opacity-60'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">2 · Statuto e regolamenti</p>
              <Badge tono={manca.regole ? 'warn' : 'ok'}>
                {manca.regole ? 'da leggere' : 'fatto'}
              </Badge>
            </div>

            {manca.regole && (
              <>
                <p className="mt-2 text-sm text-muted">
                  Un club è fatto di regole: chi non le ha lette non può prenderne parte. Aprile,
                  leggile, e poi conferma qui sotto.
                </p>

                <div className="mt-3 space-y-2">
                  {statuto.map((d) => (
                    <Link
                      key={d.id}
                      href="/statuto"
                      className="block rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:border-nvgdim"
                    >
                      {d.titolo}
                      <span className="block text-[11px] text-muted">lo statuto del team</span>
                    </Link>
                  ))}
                  {regolamenti.map((d) => (
                    <Link
                      key={d.id}
                      href={`/regolamenti/${d.slug}`}
                      className="block rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:border-nvgdim"
                    >
                      {d.titolo}
                      <span className="block text-[11px] text-muted">regolamento</span>
                    </Link>
                  ))}
                </div>

                <FormAzione azione={accettaRegole} className="mt-4">
                  <Invia icona="approva">Ho letto statuto e regolamenti</Invia>
                </FormAzione>
              </>
            )}
          </div>
        )}

        {/* ------------------------------------------------ foto */}
        <div className={`card ${manca.foto ? 'border-l-2 border-l-warn' : 'opacity-60'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">3 · Foto e riprese</p>
            <Badge tono={manca.foto ? 'info' : 'ok'}>
              {manca.foto ? 'a te la scelta' : utente.consensoImmagini ? 'sì' : 'no'}
            </Badge>
          </div>

          {manca.foto && (
            <>
              <p className="mt-2 text-sm text-muted">
                Alle giocate si fanno foto e video, e finiscono sui canali del team. Questa è una
                scelta tua e <strong className="text-ink">le due risposte vanno bene uguale</strong>
                : si entra comunque, e si cambia idea quando si vuole dal proprio profilo.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <FormAzione azione={scegliConsensoFoto} className="contents">
                  <input type="hidden" name="consenso" value="on" />
                  <Invia icona="approva">Sì, potete pubblicarle</Invia>
                </FormAzione>
                <FormAzione azione={scegliConsensoFoto} className="contents">
                  <input type="hidden" name="consenso" value="off" />
                  <Invia className="btn-ghost" icona="rifiuta">
                    No, preferisco di no
                  </Invia>
                </FormAzione>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Finito questo, il gestionale si apre e non te lo chiede più — a meno che uno dei testi non
        cambi.
      </p>
    </main>
  );
}
