import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtDateTime, fmtEuro, nomeCompleto } from '@/lib/format';
import {
  ETICHETTA_ORDINE,
  dettaglioRighe,
  giacenzaDi,
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
          aMagazzino: true,
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

  // Il magazzino: la roba comprata in blocco che sta in casa. Non entra nel
  // "da ordinare" — non c'è niente da chiedere al fornitore a ogni ordine — ma
  // è il posto dove si vede se sta finendo, e quanto ci si guadagna.
  const scorte = await prisma.voceAnnuncio.findMany({
    where: { aMagazzino: true },
    orderBy: [{ annuncio: { titolo: 'asc' } }, { ordine: 'asc' }],
    include: {
      annuncio: { select: { id: true, titolo: true, ufficiale: true } },
      carichi: { select: { quantita: true, costoUnitario: true } },
      righe: {
        where: { ordine: { stato: { not: 'ANNULLATO' } } },
        select: { quantita: true, ordine: { select: { stato: true } } },
      },
    },
  });

  const magazzino = scorte.map((v) => ({
    id: v.id,
    titolo: v.titolo,
    articolo: v.annuncio.titolo,
    strada: stradaAnnuncio(v.annuncio),
    prezzo: Number(v.prezzo),
    conto: giacenzaDi(
      v.carichi,
      v.righe.map((r) => ({ quantita: r.quantita, stato: r.ordine.stato })),
    ),
  }));

  const valoreMagazzino = magazzino.reduce(
    (s, v) => s + Math.max(0, v.conto.disponibili) * (v.conto.costoMedio ?? 0),
    0,
  );

  // il riepilogo: per ogni articolo, quanti pezzi di ogni voce servono adesso
  const giri = new Map<string, { titolo: string; strada: string; pezzi: Map<string, number> }>();
  for (const o of inRaccolta) {
    for (const r of o.righe) {
      // quello che sta in magazzino non si chiede al fornitore: si prende
      // dalla scatola, e il suo conto sta più sotto
      if (r.voce.aMagazzino) continue;
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

      {/* ------------------------------------------------ magazzino */}
      {magazzino.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="titolo-sezione">Magazzino</p>
            <p className="num text-xs text-muted">
              valore di quello che resta: {fmtEuro(valoreMagazzino)}
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="tabella">
              <thead>
                <tr>
                  <th>Cosa</th>
                  <th>Articolo</th>
                  <th>Disponibili</th>
                  <th>Impegnate</th>
                  <th>Costo medio</th>
                  <th>Prezzo</th>
                  <th>Margine</th>
                </tr>
              </thead>
              <tbody>
                {magazzino.map((v) => {
                  const margine = v.conto.costoMedio === null ? null : v.prezzo - v.conto.costoMedio;
                  return (
                    <tr key={v.id}>
                      <td className="font-medium">{v.titolo}</td>
                      <td>
                        <Link href={v.strada} className="text-muted hover:text-nvg">
                          {v.articolo}
                        </Link>
                      </td>
                      <td>
                        <Badge tono={v.conto.disponibili > 0 ? 'ok' : 'warn'}>
                          {v.conto.disponibili}
                        </Badge>
                      </td>
                      <td className="num">{v.conto.impegnate}</td>
                      <td className="num">
                        {v.conto.costoMedio === null ? '—' : fmtEuro(v.conto.costoMedio)}
                      </td>
                      <td className="num">{fmtEuro(v.prezzo)}</td>
                      <td className={`num ${margine !== null && margine < 0 ? 'text-danger' : ''}`}>
                        {margine === null ? '—' : fmtEuro(margine)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[11px] text-muted">
            I carichi si registrano dalla scheda dell’articolo, sulla voce: quantità e quanto è
            costato un pezzo. <em>Impegnate</em> sono quelle promesse a qualcuno e non ancora
            consegnate.
          </p>
        </div>
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
            const articoli = [...new Set(o.righe.map((r) => r.voce.annuncio.titolo))].join(', ');
            return (
              <div key={o.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {nomeCompleto(o.utente)}
                      <span className="num ml-2 text-[11px] text-muted">n. {o.numero}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted">{dettaglioRighe(o.righe)}</p>
                    <p className="num mt-0.5 text-[11px] text-muted">
                      {articoli} · {fmtDateTime(o.creatoIl)}
                    </p>
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
