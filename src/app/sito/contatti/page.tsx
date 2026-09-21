import type { Metadata } from 'next';
import { LINK_SOCIAL } from '../contenuti';
import { Scena } from '../Scena';
import { ModuloContatto } from './ModuloContatto';

export const metadata: Metadata = {
  title: 'Contatti · Vuoi provare?',
  description: 'Lasciaci nome e telefono: ti chiamiamo noi per una giornata di prova con Zero Dark Team.',
};

/** I tre passi, detti prima: chi scrive sa cosa succede dopo. */
const PASSI = [
  { n: '01', titolo: 'Ci scrivi', testo: 'Nome e telefono bastano. Se vuoi, raccontaci qualcosa di te.' },
  { n: '02', titolo: 'Ti chiamiamo', testo: 'Nei giorni successivi, per conoscerci e rispondere alle tue domande.' },
  { n: '03', titolo: 'Vieni in campo', testo: 'Ti proponiamo la prima giornata a cui puoi venire con noi.' },
];

/**
 * «Vuoi provare?»: la porta d'ingresso della squadra.
 *
 * Il modulo scrive dritto nel gestionale, fra i contatti da chiamare, e chi
 * segue i nuovi riceve una notifica. Da lì in poi è una telefonata.
 */
export default function ContattiSito() {
  return (
    <>
      <section className="relative overflow-hidden pb-12 pt-28">
        <Scena nome="contatti" alt="" className="absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-6xl px-4 md:px-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.35em] text-nvg">Contatti</p>
          <h1 className="text-4xl font-bold uppercase tracking-tight md:text-6xl">
            Vuoi <span className="text-nvg">provare?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink/80">
            Non serve essere esperti per cominciare: serve voglia di imparare e di stare in squadra.
            Lasciaci un contatto, e ne parliamo al telefono.
          </p>
        </div>
      </section>

      <section className="border-t border-line py-16">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-[1fr_20rem] md:px-8">
          <div className="relative">
            <ModuloContatto />

            {/* L'informativa breve: chi, perché, per quanto. */}
            <div className="mt-10 rounded-lg border border-line bg-surface/60 p-5 text-xs leading-relaxed text-muted">
              <p className="mb-2 font-mono uppercase tracking-[0.25em] text-ink/80">Informativa</p>
              <p>
                I dati che ci lasci — nome, telefono e quello che scegli di aggiungere — li usa Zero Dark
                Team solo per ricontattarti e organizzare una giornata di prova. Li vede soltanto chi
                nella squadra segue i nuovi arrivati, e non li diamo a nessun altro. Se dopo la
                telefonata non se ne fa niente, li cancelliamo; se decidi di venire, diventano la tua
                scheda nella squadra. Puoi chiederci in qualsiasi momento di vederli, correggerli o
                cancellarli, rispondendo alla nostra telefonata o scrivendoci sui nostri canali.
              </p>
            </div>
          </div>

          <aside className="space-y-8">
            <ol className="space-y-5">
              {PASSI.map((p) => (
                <li key={p.n} className="border-l-2 border-nvg/50 pl-4">
                  <p className="font-mono text-[11px] tracking-[0.3em] text-nvg">{p.n}</p>
                  <p className="mt-1 font-semibold uppercase tracking-wide">{p.titolo}</p>
                  <p className="mt-1 text-sm text-muted">{p.testo}</p>
                </li>
              ))}
            </ol>
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.3em] text-muted">Oppure seguici</p>
              <ul className="space-y-2 text-sm">
                {LINK_SOCIAL.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noreferrer" className="hover:text-nvg">
                      {l.testo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
