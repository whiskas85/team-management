import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtDateTime, inputDateTime, nomeCompleto } from '@/lib/format';
import {
  comeEFinito,
  eAperto,
  etichettaDestinatari,
  loRiguarda,
  puoFareSondaggi,
  risultato,
} from '@/lib/sondaggi';
import { Badge, Intestazione } from '@/components/ui';
import { isAdmin } from '@/lib/domain';
import { ContoAllaRovescia } from '@/components/ContoAllaRovescia';
import { VotoSondaggio, BadgeSegreto } from '@/components/VotoSondaggio';
import { AzioneBottone } from '@/components/AzioneBottone';
import { BottoneElimina } from '@/components/CardRiga';
import { BottoneModale } from '@/components/Modale';
import { FormSondaggio } from '@/components/FormSondaggio';
import {
  chiudiSondaggio,
  creaEventoDaSondaggio,
  eliminaSondaggio,
  riapriSondaggio,
} from '@/actions/sondaggi';

export const dynamic = 'force-dynamic';

/**
 * Un sondaggio: la domanda, le risposte, e cosa ne è venuto fuori.
 *
 * **Il risultato si vede sempre**, anche prima di aver votato. Nascondere i
 * numeri finché non ti esponi è un trucco da sondaggio d'opinione, dove conta
 * che la gente non si influenzi; qui conta l'opposto — se tre hanno già detto
 * sabato, il quarto deve poterlo sapere prima di dire domenica, altrimenti non
 * si trova mai una data.
 *
 * Chi ha fatto la domanda vede anche **chi** ha risposto cosa: è lui che deve
 * telefonare a quelli che mancano.
 */
export default async function SondaggioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();

  const s = await prisma.sondaggio.findUnique({
    where: { id },
    include: {
      creatoDa: { select: { nome: true, cognome: true, callsign: true } },
      evento: { select: { id: true, titolo: true } },
      opzioni: {
        orderBy: { ordine: 'asc' },
        include: {
          propostaDa: { select: { nome: true, cognome: true, callsign: true } },
          voti: {
            select: {
              userId: true,
              utente: { select: { nome: true, cognome: true, callsign: true } },
            },
          },
        },
      },
    },
  });

  if (!s) notFound();

  const gestisce = puoFareSondaggi(me.roles);
  // modificarlo, chiuderlo, riaprirlo ed eliminarlo tocca a chi l'ha aperto,
  // e all'admin anche su quelli degli altri
  const autore = s.creatoDaId === me.id;
  const governa = autore || isAdmin(me.roles);
  // chi non è fra i destinatari non deve nemmeno sapere che esiste — tranne
  // chi governa i sondaggi, che li deve poter rileggere tutti
  if (!loRiguarda(s.destinatari, me.stato) && !gestisce && s.creatoDaId !== me.id) notFound();

  const aperto = eAperto(s);
  const esito = risultato(s.opzioni);
  const miei = s.opzioni.filter((o) => o.voti.some((v) => v.userId === me.id)).map((o) => o.id);
  const votanti = new Set(s.opzioni.flatMap((o) => o.voti.map((v) => v.userId))).size;

  return (
    <>
      <Link href="/sondaggi" className="mb-4 inline-block text-xs text-muted hover:text-nvg">
        ← Sondaggi
      </Link>

      <Intestazione
        titolo={s.domanda}
        // la descrizione sta in testata, con la domanda: è la seconda metà di
        // quello che si chiede, e staccata sotto si perdeva
        descrizione={s.dettaglio}
        sottotitolo={etichettaDestinatari[s.destinatari]}
        azioni={
          <>
            {aperto && s.scadeIl && (
              <ContoAllaRovescia
                scadenza={s.scadeIl.toISOString()}
                etichetta="si vota per"
                scaduto="voto chiuso"
              />
            )}
            {!aperto && <Badge tono="neutro">{comeEFinito(s)}</Badge>}
            {s.segreto && <BadgeSegreto />}
          </>
        }
      />

      {/* Con la copertina il sondaggio si apre in due: a sinistra la domanda
          e le risposte, a destra la locandina con il suo titolo. Sul telefono
          una colonna sola, e la locandina scende in fondo: prima si vota. */}
      <div
        className={
          s.copertinaPath ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start' : ''
        }
      >
        <div className="min-w-0">
          {s.evento && (
            <div className="mb-5 rounded-md border border-nvg/40 bg-nvg/10 px-4 py-3 text-sm">
              Da questo sondaggio è nata un’attività:{' '}
              <Link href={`/calendario/${s.evento.id}`} className="text-nvg hover:underline">
                {s.evento.titolo}
              </Link>
            </div>
          )}

          {!aperto && <Verdetto esito={esito} opzioni={s.opzioni} votanti={votanti} />}

          <VotoSondaggio
            sondaggioId={s.id}
            aperto={aperto}
            sceltaMultipla={s.sceltaMultipla}
            puoProporre={s.proposteAperte && loRiguarda(s.destinatari, me.stato)}
            soloOsservo={!loRiguarda(s.destinatari, me.stato)}
            miei={miei}
            totale={votanti}
            opzioni={s.opzioni.map((o) => ({
              id: o.id,
              testo: o.quando ? fmtDateTime(o.quando) : o.testo,
              voti: o.voti.length,
              vince: esito.vincitrice === o.id,
              // Chi ha fatto la domanda vede i nomi mentre è aperto: è lui che
              // deve richiamare quelli che mancano. Chiuso, li vede chiunque
              // lo guardi — a cose fatte «chi ha risposto cosa» è la
              // decisione stessa. Sul voto segreto mai, per nessuno.
              chi:
                (gestisce || !aperto) && !s.segreto
                  ? o.voti.map((v) => v.utente.callsign ?? `${v.utente.nome} ${v.utente.cognome}`)
                  : null,
              // chi l'ha proposta si vede, tranne sul voto segreto: la proposta
              // vale anche come voto, e il nome direbbe per cosa ha votato
              proposta:
                o.propostaDa && !s.segreto
                  ? (o.propostaDa.callsign ?? `${o.propostaDa.nome} ${o.propostaDa.cognome}`)
                  : null,
            }))}
          />

          {/* ------------------------------------------------ cosa se ne fa */}
          {gestisce && (
            <div className="card mt-6">
              <p className="titolo-sezione mb-3">Cosa se ne fa</p>

              {esito.pari && (
                <p className="mb-3 text-sm text-warn">
                  Due risposte sono a pari merito: l’attività non nasce da sola, scegli tu quale vale.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {/* un refuso nella domanda, una data sbagliata, una risposta che
                    manca: si corregge qui, senza buttare i voti già dati */}
                {governa && aperto && (
                  <BottoneModale
                    etichetta="Modifica"
                    icona="modifica"
                    titolo="Modifica il sondaggio"
                    className="btn-ghost btn-sm"
                  >
                    <FormSondaggio
                      sondaggio={{
                        id: s.id,
                        tipo: s.tipo,
                        domanda: s.domanda,
                        dettaglio: s.dettaglio,
                        destinatari: s.destinatari,
                        sceltaMultipla: s.sceltaMultipla,
                        segreto: s.segreto,
                        proposteAperte: s.proposteAperte,
                        conVoti: votanti > 0,
                  copertina: !!s.copertinaPath,
                  copertinaTitolo: s.copertinaTitolo,
                        scadeIl: inputDateTime(s.scadeIl),
                        opzioni: s.opzioni.map((o) => ({
                          id: o.id,
                          testo: o.testo,
                          quando: inputDateTime(o.quando),
                        })),
                      }}
                    />
                  </BottoneModale>
                )}

                {!s.evento && (s.tipo === 'DATA' || s.tipo === 'PRESENZE') && (
                  <AzioneBottone
                    azione={creaEventoDaSondaggio}
                    valori={{ id: s.id }}
                    icona="calendario"
                    className="btn-primary btn-sm"
                    conferma={
                      s.segreto
                        ? 'Creo l’attività in bozza? Il voto era segreto: chi ha votato non viene segnato.'
                        : s.tipo === 'PRESENZE'
                          ? 'Creo l’attività in bozza con dentro chi ha detto di esserci?'
                          : 'Creo l’attività in bozza con la data che ha vinto, e dentro chi l’ha votata?'
                    }
                  >
                    Crea l’attività
                  </AzioneBottone>
                )}

                {!governa ? null : aperto ? (
                  <AzioneBottone
                    azione={chiudiSondaggio}
                    valori={{ id: s.id }}
                    icona="concludi"
                    className="btn-ghost btn-sm"
                    conferma="Chiudere il sondaggio? Non si vota più, e scende nello storico."
                  >
                    Chiudi
                  </AzioneBottone>
                ) : (
                  <AzioneBottone
                    azione={riapriSondaggio}
                    valori={{ id: s.id }}
                    icona="riapri"
                    className="btn-ghost btn-sm"
                  >
                    Riapri
                  </AzioneBottone>
                )}

                {governa && (
                  <span className="ml-auto">
                    <BottoneElimina
                      azione={eliminaSondaggio}
                      valori={{ id: s.id }}
                      conferma={`Eliminare «${s.domanda}» e tutte le risposte raccolte?`}
                      etichetta="Elimina il sondaggio"
                    />
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs text-muted">
                L’attività nasce <strong className="text-ink">in bozza</strong>: le manca il campo, la
                quota, chi ne risponde. La rilasci tu quando è completa.
              </p>
            </div>
          )}

          {/* Chi l'ha aperto e quando: è lui che lo modifica e lo chiude, e a lui
              si chiede se qualcosa non torna. */}
          <p className="num mt-6 border-t border-line pt-3 text-xs text-muted">
            Aperto da {autore ? 'te' : nomeCompleto(s.creatoDa)} il {fmtDateTime(s.creatoIl)}
          </p>
        </div>

        {s.copertinaPath && (
          <figure className="card overflow-hidden p-0 lg:sticky lg:top-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/sondaggi/copertina/${s.id}`}
              alt={s.copertinaTitolo ?? s.domanda}
              className="block w-full object-cover"
            />
            {s.copertinaTitolo && (
              <figcaption className="px-4 py-3 text-sm font-medium">{s.copertinaTitolo}</figcaption>
            )}
          </figure>
        )}
      </div>
    </>
  );
}

/**
 * Com'è finita, detto grande in cima a un sondaggio chiuso.
 *
 * A cose fatte la domanda che interessa è una: cosa si è deciso. Le barre la
 * dicono, ma bisogna confrontarle; qui la si legge senza pensarci — la risposta
 * che ha vinto e con quanti voti, o fra chi è finita pari. Sotto, le risposte
 * con i nomi di chi le ha date.
 */
function Verdetto({
  esito,
  opzioni,
  votanti,
}: {
  esito: { vincitrice: string | null; pari: boolean; massimo: number };
  opzioni: { id: string; testo: string; quando: Date | null; voti: unknown[] }[];
  votanti: number;
}) {
  const nome = (o: (typeof opzioni)[number]) => (o.quando ? fmtDateTime(o.quando) : o.testo);
  const vinta = opzioni.find((o) => o.id === esito.vincitrice);

  if (votanti === 0) {
    return (
      <div className="card mb-5 text-sm text-muted">Chiuso senza risposte: non si è deciso niente.</div>
    );
  }

  if (vinta) {
    return (
      <div className="mb-5 rounded-lg border border-nvg/60 bg-nvg/10 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-nvg">Ha vinto</p>
        <p className="mt-1 break-words text-2xl font-semibold text-ink">{nome(vinta)}</p>
        <p className="num mt-1 text-sm text-muted">
          {vinta.voti.length} su {votanti} {votanti === 1 ? 'persona' : 'persone'} ·{' '}
          {Math.round((vinta.voti.length / votanti) * 100)}%
        </p>
      </div>
    );
  }

  const pari = opzioni.filter((o) => o.voti.length === esito.massimo);
  return (
    <div className="mb-5 rounded-lg border border-warn/50 bg-warn/10 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warn">Pari</p>
      <p className="mt-1 break-words text-xl font-semibold text-ink">
        {pari.map(nome).join(' · ')}
      </p>
      <p className="num mt-1 text-sm text-muted">
        {esito.massimo} {esito.massimo === 1 ? 'voto' : 'voti'} ciascuna, su {votanti}{' '}
        {votanti === 1 ? 'persona' : 'persone'}
      </p>
    </div>
  );
}
