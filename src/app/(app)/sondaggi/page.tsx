import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtDateTime } from '@/lib/format';
import {
  eAperto,
  etichettaDestinatari,
  loRiguarda,
  puoFareSondaggi,
  risultato,
} from '@/lib/sondaggi';
import { BadgeSegreto } from '@/components/VotoSondaggio';
import { Badge, Intestazione, Vuoto } from '@/components/ui';
import { BottoneModale } from '@/components/Modale';
import { ScegliVista } from '@/components/ScegliVista';
import { FormSondaggio } from '@/components/FormSondaggio';
import { ContoAllaRovescia } from '@/components/ContoAllaRovescia';

export const dynamic = 'force-dynamic';

const VISTE = [
  { chiave: 'correnti', href: '/sondaggi', testo: 'Aperti' },
  { chiave: 'storico', href: '/sondaggi?vista=storico', testo: 'Storico' },
];

/**
 * Le domande aperte, e quelle a cui si è già risposto.
 *
 * **Si vede solo quello che riguarda chi guarda**: un sondaggio per la squadra
 * non compare a un contatto, e uno per i nuovi non intasa la pagina di chi è
 * dentro da tre anni. Non è pudore, è che una pagina piena di domande che non
 * ti spettano smette di essere una pagina che apri.
 *
 * Aperti e storico stanno dietro allo stesso indirizzo, come nel calendario: a
 * cose fatte non si vota più, ma il risultato resta — ed è il motivo per cui un
 * sondaggio è meglio di un giro di messaggi.
 */
export default async function SondaggiPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const me = await requireUser();
  const { vista } = await searchParams;
  const storico = vista === 'storico';

  const tutti = await prisma.sondaggio.findMany({
    orderBy: [{ scadeIl: 'asc' }, { creatoIl: 'desc' }],
    include: {
      creatoDa: { select: { nome: true, cognome: true, callsign: true } },
      opzioni: {
        orderBy: { ordine: 'asc' },
        select: { id: true, testo: true, quando: true, voti: { select: { userId: true } } },
      },
      evento: { select: { id: true, titolo: true } },
    },
  });

  // I sondaggi rivolti a me, e quelli che ho aperto io per altri: chi fa una
  // domanda ai nuovi non è un nuovo, ma il suo sondaggio lo deve ritrovare.
  const perMe = (s: (typeof tutti)[number]) => loRiguarda(s.destinatari, me.stato);
  const miei = tutti.filter((s) => perMe(s) || s.creatoDaId === me.id);
  const elenco = miei.filter((s) => (storico ? !eAperto(s) : eAperto(s)));

  const haVotato = (s: (typeof elenco)[number]) =>
    s.opzioni.some((o) => o.voti.some((v) => v.userId === me.id));

  // Negli aperti, prima quelli che aspettano te: sono la ragione per cui si
  // apre la pagina. Quelli già risposti stanno sotto, a guardare come va.
  const gruppi = storico
    ? [{ titolo: '', sondaggi: elenco }]
    : [
        { titolo: 'Da rispondere', sondaggi: elenco.filter((s) => perMe(s) && !haVotato(s)) },
        { titolo: 'Hai risposto', sondaggi: elenco.filter((s) => perMe(s) && haVotato(s)) },
        { titolo: 'Aperti da te per altri', sondaggi: elenco.filter((s) => !perMe(s)) },
      ];

  const scheda = (s: (typeof elenco)[number]) => {
    const hoVotato = s.opzioni.some((o) => o.voti.some((v) => v.userId === me.id));
    const votanti = new Set(s.opzioni.flatMap((o) => o.voti.map((v) => v.userId))).size;
    // aperto da me per altri: lo vedo, non lo voto. Il bordo tratteggiato lo
    // dice prima ancora di leggere
    const soloOsservo = !perMe(s);

    return (
      <Link
        key={s.id}
        href={`/sondaggi/${s.id}`}
        className={`card block transition-colors hover:border-nvgdim ${
          soloOsservo ? 'border-dashed opacity-75' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words font-medium">{s.domanda}</h3>
            {s.dettaglio && (
              <p className="mt-0.5 line-clamp-2 break-words text-sm text-ink/80">{s.dettaglio}</p>
            )}
            <p className="mt-1 text-xs text-muted">
              {etichettaDestinatari[s.destinatari]} ·{' '}
              {s.creatoDa.callsign ?? `${s.creatoDa.nome} ${s.creatoDa.cognome}`} ·{' '}
              <span className="num">
                {votanti} {votanti === 1 ? 'risposta' : 'risposte'}
              </span>
            </p>
          </div>

          <span className="flex shrink-0 flex-col items-end gap-1.5">
            {/* Chi ha già risposto lo sa: il verde dice «fatto», e serve
                        a non riaprire per controllare. */}
            {!storico && soloOsservo && <Badge tono="neutro">non voti</Badge>}
            {!storico && !soloOsservo && (
              <Badge tono={hoVotato ? 'ok' : 'warn'}>
                {hoVotato ? 'hai risposto' : 'da rispondere'}
              </Badge>
            )}
            {storico && s.evento && <Badge tono="info">è diventato un’attività</Badge>}
            {s.segreto && <BadgeSegreto />}
          </span>
        </div>

        <Anteprima opzioni={s.opzioni} votanti={votanti} />

        {/* Il tempo che resta scorre davvero: qui dentro non è una
                    fotografia come nella notifica. */}
        {!storico && s.scadeIl && (
          <p className="mt-2 text-xs text-muted">
            <ContoAllaRovescia
              scadenza={s.scadeIl.toISOString()}
              etichetta="si vota per"
              scaduto="voto chiuso"
            />
          </p>
        )}
        {storico && (
          <p className="num mt-2 text-xs text-muted">
            {s.chiusoIl
              ? `chiuso il ${fmtDateTime(s.chiusoIl)}`
              : s.scadeIl
                ? `scaduto il ${fmtDateTime(s.scadeIl)}`
                : ''}
          </p>
        )}
      </Link>
    );
  };

  return (
    <>
      <Intestazione
        titolo="Sondaggi"
        sottotitolo={
          storico
            ? 'Le domande chiuse, con il risultato'
            : 'Le domande aperte: rispondi, e puoi cambiare idea finché sono aperte'
        }
        azioni={
          <>
            <ScegliVista viste={VISTE} attuale={storico ? 'storico' : 'correnti'} />
            {puoFareSondaggi(me.roles) && (
              <BottoneModale
                etichetta="Nuovo sondaggio"
                icona="aggiungi"
                titolo="Nuovo sondaggio"
                larga
              >
                <FormSondaggio />
              </BottoneModale>
            )}
          </>
        }
      />

      {elenco.length === 0 ? (
        <Vuoto
          testo={
            storico
              ? 'Nessun sondaggio chiuso: quando se ne chiude uno, il risultato resta qui.'
              : 'Nessuna domanda aperta in questo momento.'
          }
        />
      ) : (
        <div className="space-y-6">
          {gruppi.map((g) =>
            g.sondaggi.length === 0 ? null : (
              <section key={g.titolo}>
                {g.titolo && <h2 className="titolo-sezione mb-3">{g.titolo}</h2>}
                <div className="space-y-3">{g.sondaggi.map(scheda)}</div>
              </section>
            ),
          )}
        </div>
      )}
    </>
  );
}

/**
 * Com'è messo il sondaggio, senza aprirlo: una riga per risposta con la sua
 * barra, come dentro ma in piccolo. Le prime quattro nell'ordine in cui sono
 * scritte — riordinarle per voti le farebbe saltare di posto a ogni voto — e
 * quante altre ce ne sono. I conti si vedono anche sul voto segreto: segreto
 * è chi ha votato cosa, non quanti.
 */
function Anteprima({
  opzioni,
  votanti,
}: {
  opzioni: { id: string; testo: string; quando: Date | null; voti: unknown[] }[];
  votanti: number;
}) {
  if (opzioni.length === 0) return null;
  const esito = risultato(opzioni);
  const mostrate = opzioni.slice(0, 4);
  const altre = opzioni.length - mostrate.length;

  return (
    <div className="mt-3 space-y-1.5 border-t border-line pt-3">
      {mostrate.map((o) => {
        const quota = votanti > 0 ? Math.round((o.voti.length / votanti) * 100) : 0;
        const vince = esito.vincitrice === o.id;
        return (
          <div key={o.id} className="text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className={`min-w-0 truncate ${vince ? 'text-nvg' : 'text-ink/85'}`}>
                {o.quando ? fmtDateTime(o.quando) : o.testo}
              </span>
              <span className="num shrink-0 text-muted">{o.voti.length}</span>
            </div>
            <span className="mt-1 block h-1 rounded-full bg-surface2">
              <span
                className={`block h-1 rounded-full ${vince ? 'bg-nvg' : 'bg-nvgdim'}`}
                style={{ width: `${quota}%` }}
              />
            </span>
          </div>
        );
      })}
      {altre > 0 && (
        <p className="text-[11px] text-muted">
          e {altre} {altre === 1 ? 'altra risposta' : 'altre risposte'}
        </p>
      )}
    </div>
  );
}
