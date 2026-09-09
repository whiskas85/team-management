import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtDateTime, fmtEuro, nomeCompleto } from '@/lib/format';
import {
  ETICHETTA_ORDINE,
  descriviRiga,
  puoVedereOrdini,
  stradaAnnuncio,
  totaleRighe,
} from '@/lib/mercatino';
import { Badge, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { AzioneBottone } from '@/components/AzioneBottone';
import { annullaOrdine, chiudiRaccolta, statoOrdine } from '@/actions/ordini';

export const dynamic = 'force-dynamic';

/**
 * Gli ordini del merchandising, per chi tiene i conti.
 *
 * La pagina serve a rispondere a una domanda sola — **quanti pezzi ordinare al
 * fornitore** — e a farlo senza contare i messaggi in chat. Per questo il
 * riepilogo sta in cima e l'elenco sotto: il primo è il motivo per cui uno apre
 * questa pagina, il secondo è dove si va a cercare il singolo caso.
 *
 * Il riepilogo conta **solo la raccolta aperta**. Un numero che somma tutti gli
 * ordini mai fatti serve una volta sola: al secondo giro mescola le magliette
 * già comprate con quelle nuove, e diventa un numero di cui non ci si può
 * fidare — cioè peggio di niente.
 */

const FILTRI = [
  { chiave: 'aperti', etichetta: 'Da chiudere' },
  { chiave: 'RACCOLTA', etichetta: 'In raccolta' },
  { chiave: 'ORDINATO', etichetta: 'Dal fornitore' },
  { chiave: 'ARRIVATO', etichetta: 'Da consegnare' },
  { chiave: 'CONSEGNATO', etichetta: 'Consegnati' },
  { chiave: 'ANNULLATO', etichetta: 'Annullati' },
  { chiave: 'tutti', etichetta: 'Tutti' },
] as const;

/** Il passo successivo di un ordine: uno solo, quello che si fa davvero. */
const AVANTI: Record<string, { stato: string; etichetta: string } | undefined> = {
  RACCOLTA: { stato: 'ORDINATO', etichetta: 'ordinato al fornitore' },
  ORDINATO: { stato: 'ARRIVATO', etichetta: 'arrivato' },
  ARRIVATO: { stato: 'CONSEGNATO', etichetta: 'consegnato' },
};

const TONO: Record<string, 'ok' | 'warn' | 'info' | 'neutro'> = {
  RACCOLTA: 'warn',
  ORDINATO: 'info',
  ARRIVATO: 'info',
  CONSEGNATO: 'ok',
  ANNULLATO: 'neutro',
};

/** Le righe portano dietro l'articolo da cui vengono: serve al riepilogo. */
const CON_RIGHE = {
  righe: {
    include: {
      voce: {
        select: {
          articoloId: true,
          annuncio: { select: { id: true, titolo: true, ufficiale: true } },
        },
      },
    },
  },
} satisfies Prisma.OrdineInclude;

export default async function OrdiniPage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string }>;
}) {
  await requirePermesso(puoVedereOrdini);
  const { stato: filtro = 'aperti' } = await searchParams;

  const dove: Prisma.OrdineWhereInput =
    filtro === 'tutti'
      ? {}
      : filtro === 'aperti'
        ? { stato: { in: ['RACCOLTA', 'ORDINATO', 'ARRIVATO'] } }
        : { stato: filtro as never };

  const [ordini, inRaccolta] = await Promise.all([
    prisma.ordine.findMany({
      where: dove,
      orderBy: { creatoIl: 'desc' },
      include: {
        ...CON_RIGHE,
        utente: { select: { nome: true, cognome: true, callsign: true } },
        payment: { select: { id: true, status: true, pagato: true, importo: true } },
      },
    }),
    prisma.ordine.findMany({ where: { stato: 'RACCOLTA' }, include: CON_RIGHE }),
  ]);

  // Il magazzino non si conta qui: ha una pagina sua. Serve solo sapere se
  // esiste, per mandarci chi lo cerca.
  const scorte = await prisma.articoloMagazzino.count();

  // il riepilogo: per ogni articolo, quanti pezzi di ogni voce servono adesso
  const giri = new Map<string, { titolo: string; strada: string; pezzi: Map<string, number> }>();
  for (const o of inRaccolta) {
    for (const r of o.righe) {
      // quello che sta in magazzino non si chiede al fornitore: si prende
      // dalla scatola, e il suo conto sta più sotto
      // quello che sta sullo scaffale non si chiede al fornitore a ogni giro:
      // c'è già in casa, e il conto dei pezzi da ordinare lo falserebbe
      if (r.voce.articoloId) continue;
      const a = r.voce.annuncio;
      const giro = giri.get(a.id) ?? {
        titolo: a.titolo,
        strada: stradaAnnuncio(a),
        pezzi: new Map<string, number>(),
      };
      giro.pezzi.set(r.titolo, (giro.pezzi.get(r.titolo) ?? 0) + r.quantita);
      giri.set(a.id, giro);
    }
  }

  const pezziInRaccolta = inRaccolta.reduce(
    (s, o) => s + o.righe.reduce((n, r) => n + r.quantita, 0),
    0,
  );
  const valoreRaccolta = inRaccolta.reduce((s, o) => s + totaleRighe(o.righe), 0);
  const daIncassare = ordini
    .filter((o) => o.stato !== 'ANNULLATO' && o.payment && o.payment.status !== 'PAGATO')
    .reduce((s, o) => s + Number(o.payment!.importo) - Number(o.payment!.pagato), 0);

  return (
    <>
      <Intestazione
        titolo="Ordini"
        sottotitolo="Il merchandising ordinato dalla squadra, e quanti pezzi servono al fornitore."
        azioni={
          inRaccolta.length > 0 ? (
            <AzioneBottone
              azione={chiudiRaccolta}
              valori={{}}
              icona="concludi"
              conferma="Chiudere il giro? Gli ordini in raccolta passano a «ordinato al fornitore» e il riepilogo riparte da zero."
              className="btn-primary"
            >
              Chiudi il giro
            </AzioneBottone>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Statistica
          etichetta="In raccolta"
          valore={inRaccolta.length}
          dettaglio={`${pezziInRaccolta === 1 ? '1 pezzo' : `${pezziInRaccolta} pezzi`} · ${fmtEuro(valoreRaccolta)}`}
          tono={inRaccolta.length > 0 ? 'warn' : 'neutro'}
        />
        <Statistica
          etichetta="Da incassare"
          valore={fmtEuro(daIncassare)}
          dettaglio="quote degli ordini in elenco"
          tono={daIncassare > 0 ? 'warn' : 'ok'}
        />
        <Statistica etichetta="Ordini in elenco" valore={ordini.length} />
      </div>

      {/* ------------------------------------------------ da ordinare */}
      {giri.size > 0 && (
        <div className="mb-6 space-y-3">
          <p className="titolo-sezione">Da ordinare al fornitore</p>
          {[...giri.entries()].map(([annuncioId, giro]) => (
            <div key={annuncioId} className="card border-l-2 border-l-warn">
              <Link href={giro.strada} className="font-medium hover:text-nvg">
                {giro.titolo}
              </Link>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                {[...giro.pezzi.entries()].map(([titolo, quanti]) => (
                  <span
                    key={titolo}
                    className="rounded-lg border border-line bg-surface2 px-3 py-1.5 text-sm"
                  >
                    {titolo} <span className="num font-semibold text-nvg">× {quanti}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted">
            Il giro è uno solo per tutto il merchandising: un ordine può contenere una maglietta e
            due patch, e spezzarlo vorrebbe dire spezzare anche la sua quota.
          </p>
        </div>
      )}

      {/* il magazzino ha una pagina sua: qui si guarda cosa ordina la
          squadra, là cosa c’è in casa e cosa si compra dal fornitore */}
      {scorte > 0 && (
        <p className="mb-6 text-xs text-muted">
          Quello che sta in casa non entra in questo elenco: giacenze, riordini al fornitore e
          registro stanno in{' '}
          <Link href="/admin/magazzino" className="text-nvg hover:underline">
            Magazzino
          </Link>
          .
        </p>
      )}

      {/* ------------------------------------------------ elenco */}
      <div className="mb-4 flex flex-wrap gap-1">
        {FILTRI.map((f) => (
          <Link
            key={f.chiave}
            href={`/admin/ordini?stato=${f.chiave}`}
            className={`rounded border px-2.5 py-1 text-xs transition-colors ${
              filtro === f.chiave
                ? 'border-nvgdim bg-nvg/10 text-nvg'
                : 'border-line text-muted hover:border-nvgdim hover:text-ink'
            }`}
          >
            {f.etichetta}
          </Link>
        ))}
      </div>

      {ordini.length === 0 ? (
        <Vuoto testo="Nessun ordine da mostrare qui." />
      ) : (
        <div className="space-y-3">
          {ordini.map((o) => {
            const avanti = AVANTI[o.stato];
            const incassato = o.payment != null && Number(o.payment.pagato) > 0;
            return (
              <div key={o.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {nomeCompleto(o.utente)}
                      <span className="num ml-2 text-[11px] text-muted">n. {o.numero}</span>
                    </p>
                    {/* una riga per pezzo, con dentro il suo articolo: chi
                        legge non deve indovinare quale voce sta con quale */}
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
                    <p className="num mt-1 text-[11px] text-muted">{fmtDateTime(o.creatoIl)}</p>
                    {o.note && <p className="mt-1 text-sm">«{o.note}»</p>}
                  </div>
                  <p className="num shrink-0 text-lg font-semibold text-nvg">
                    {fmtEuro(totaleRighe(o.righe))}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <Badge tono={TONO[o.stato]}>{ETICHETTA_ORDINE[o.stato]}</Badge>
                  {/* i soldi stanno sul pagamento, e sono un'altra cosa da dove
                      si trova la merce: uno paga oggi e ritira fra tre settimane */}
                  {o.payment ? (
                    <Badge tono={o.payment.status === 'PAGATO' ? 'ok' : 'warn'}>
                      {o.payment.status === 'PAGATO'
                        ? 'quota incassata'
                        : `quota da incassare · ${fmtEuro(
                            Number(o.payment.importo) - Number(o.payment.pagato),
                          )}`}
                    </Badge>
                  ) : (
                    <Badge tono="neutro">senza quota</Badge>
                  )}

                  <span className="ml-auto flex flex-wrap items-center gap-2">
                    {avanti && (
                      <AzioneBottone
                        azione={statoOrdine}
                        valori={{ id: o.id, stato: avanti.stato }}
                        className="btn-ghost btn-sm"
                        icona="freccia"
                      >
                        {avanti.etichetta}
                      </AzioneBottone>
                    )}
                    {o.stato !== 'ANNULLATO' && !incassato && (
                      <AzioneBottone
                        azione={annullaOrdine}
                        valori={{ id: o.id }}
                        conferma="Annullare l’ordine? Sparisce anche la sua quota."
                        className="text-[11px] text-muted transition-colors hover:text-danger"
                      >
                        annulla
                      </AzioneBottone>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
