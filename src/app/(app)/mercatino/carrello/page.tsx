import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtDateTime, fmtEuro } from '@/lib/format';
import {
  ETICHETTA_ORDINE,
  descriviRiga,
  ordinabile,
  puoVedereMerchandising,
  stradaAnnuncio,
  totaleRighe,
} from '@/lib/mercatino';
import { Badge, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import {
  annullaOrdine,
  cambiaRigaCarrello,
  inviaOrdine,
  svuotaCarrello,
} from '@/actions/ordini';

export const dynamic = 'force-dynamic';

/**
 * Il carrello, e gli ordini che ne sono usciti.
 *
 * Il carrello è **uno solo e attraversa il catalogo**: si gira il
 * merchandising, si aggiunge quello che serve dalle singole voci, e si ordina
 * da qui quando si è finito. Quello che si ordina insieme diventa un ordine
 * solo e una quota sola — con un ordine per articolo la segreteria si
 * ritroverebbe a incassare quattro righe alla stessa persona.
 */
export default async function CarrelloPage() {
  const me = await requireUser();
  // il carrello esiste solo per il catalogo del team, che è l'unica cosa che
  // si ordina: fra due soci ci si accorda, non si fa un checkout
  if (!puoVedereMerchandising(me.stato)) notFound();

  const [righe, ordini] = await Promise.all([
    prisma.rigaCarrello.findMany({
      where: { userId: me.id },
      orderBy: { aggiuntaIl: 'asc' },
      include: {
        voce: {
          include: {
            annuncio: { select: { id: true, titolo: true, stato: true, ufficiale: true } },
          },
        },
      },
    }),
    prisma.ordine.findMany({
      where: { userId: me.id, stato: { not: 'ANNULLATO' } },
      orderBy: { creatoIl: 'desc' },
      take: 20,
      include: {
        righe: { include: { voce: { select: { annuncio: { select: { titolo: true } } } } } },
        payment: { select: { status: true, pagato: true } },
      },
    }),
  ]);

  const ordinabili = righe.filter(
    (r) => r.voce.annuncio.ufficiale && r.voce.annuncio.stato === 'PUBBLICATO' && ordinabile(r.voce),
  );
  const totale = ordinabili.reduce((s, r) => s + Number(r.voce.prezzo) * r.quantita, 0);
  const pezzi = ordinabili.reduce((s, r) => s + r.quantita, 0);

  return (
    <>
      <Intestazione
        titolo="Carrello"
        sottotitolo="Quello che hai messo da parte nel merchandising, in un ordine solo"
        azioni={
          righe.length > 0 ? (
            <AzioneBottone
              azione={svuotaCarrello}
              valori={{}}
              icona="elimina"
              conferma="Svuotare il carrello?"
              className="btn-ghost"
            >
              Svuota
            </AzioneBottone>
          ) : undefined
        }
      />

      {righe.length === 0 ? (
        <Vuoto
          testo="Carrello vuoto. Apri il merchandising, scegli quanti pezzi ti servono e premi Aggiungi."
          azione={
            <Link href="/merchandising" className="btn-primary">
              Vai al merchandising
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-2">
            {righe.map((r) => {
              const vivo =
                r.voce.annuncio.ufficiale &&
                r.voce.annuncio.stato === 'PUBBLICATO' &&
                ordinabile(r.voce);
              return (
                <div
                  key={r.id}
                  className={`rounded-lg border bg-surface p-3 ${
                    vivo ? 'border-line' : 'border-warn/40'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{r.voce.titolo}</p>
                      <Link
                        href={stradaAnnuncio(r.voce.annuncio)}
                        className="text-xs text-muted hover:text-nvg"
                      >
                        {r.voce.annuncio.titolo}
                      </Link>
                    </div>
                    <p className="num font-semibold text-nvg">
                      {fmtEuro(Number(r.voce.prezzo) * r.quantita)}
                      <span className="ml-1 text-[11px] font-normal text-muted">
                        {fmtEuro(Number(r.voce.prezzo))} l’uno
                      </span>
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {!vivo && <Badge tono="warn">non più in vendita</Badge>}

                    <span className="flex items-center gap-1">
                      <AzioneBottone
                        azione={cambiaRigaCarrello}
                        valori={{ id: r.id, quantita: String(r.quantita - 1) }}
                        className="h-7 w-7 rounded border border-line text-muted transition-colors hover:border-nvgdim hover:text-ink"
                      >
                        −
                      </AzioneBottone>
                      <span className="num w-6 text-center text-sm">{r.quantita}</span>
                      <AzioneBottone
                        azione={cambiaRigaCarrello}
                        valori={{ id: r.id, quantita: String(r.quantita + 1) }}
                        className="h-7 w-7 rounded border border-line text-muted transition-colors hover:border-nvgdim hover:text-ink"
                      >
                        +
                      </AzioneBottone>
                    </span>

                    <AzioneBottone
                      azione={cambiaRigaCarrello}
                      valori={{ id: r.id, quantita: '0' }}
                      className="ml-auto text-[11px] text-muted transition-colors hover:text-danger"
                    >
                      togli
                    </AzioneBottone>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ------------------------------------------------ checkout */}
          <div className="lg:col-span-1">
            <FormAzione azione={inviaOrdine} className="card space-y-3">
              <p className="titolo-sezione">Ordine</p>

              <div className="flex items-baseline justify-between gap-2 border-b border-line pb-3">
                <span className="text-xs text-muted">
                  {pezzi === 1 ? '1 pezzo' : `${pezzi} pezzi`}
                </span>
                <span className="num text-xl font-semibold text-nvg">{fmtEuro(totale)}</span>
              </div>

              <textarea
                name="note"
                rows={2}
                maxLength={500}
                className="input"
                placeholder="Una nota per chi raccoglie l’ordine (facoltativa)"
              />

              <Invia icona="carrello" className="btn-primary w-full justify-center">
                Invia l’ordine
              </Invia>

              <p className="text-[11px] text-muted">
                Nasce una quota fra i tuoi pagamenti: la incassa la segreteria, come le altre. Puoi
                ritirare l’ordine finché non è stata incassata, e il prezzo resta quello di oggi
                anche se poi cambia.
              </p>
            </FormAzione>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- i miei ordini */}
      {ordini.length > 0 && (
        <div className="mt-8">
          <p className="titolo-sezione mb-3">I tuoi ordini</p>
          <div className="space-y-2">
            {ordini.map((o) => (
              <div key={o.id} className="rounded-lg border border-line bg-surface p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="num text-[11px] text-muted">
                    n. {o.numero} · {fmtDateTime(o.creatoIl)}
                  </span>
                  <span className="num font-semibold text-nvg">{fmtEuro(totaleRighe(o.righe))}</span>
                </div>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {o.righe.map((r) => (
                    <li key={r.id}>
                      {descriviRiga({
                        titolo: r.titolo,
                        quantita: r.quantita,
                        articolo: r.voce.annuncio.titolo,
                      })}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tono={o.stato === 'ARRIVATO' ? 'ok' : 'info'}>
                    {ETICHETTA_ORDINE[o.stato]}
                  </Badge>
                  {/* pagato e consegnato sono due cose diverse: uno paga oggi e
                      ritira quando la fornitura arriva */}
                  {o.payment?.status === 'NON_GESTITO' ? (
                    <Badge tono="neutro">si paga fuori dal gestionale</Badge>
                  ) : (
                    <Badge tono={o.payment?.status === 'PAGATO' ? 'ok' : 'warn'}>
                      {o.payment
                        ? o.payment.status === 'PAGATO'
                          ? 'quota saldata'
                          : 'quota da saldare'
                        : 'senza quota'}
                    </Badge>
                  )}
                  {o.stato === 'RACCOLTA' && Number(o.payment?.pagato ?? 0) === 0 && (
                    <AzioneBottone
                      azione={annullaOrdine}
                      valori={{ id: o.id }}
                      conferma="Ritirare l’ordine? Sparisce anche la quota."
                      className="ml-auto text-[11px] text-muted transition-colors hover:text-danger"
                    >
                      ritira
                    </AzioneBottone>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
