import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { casseGestite } from '@/lib/casse';
import { numeroInternazionale } from '@/lib/messaggi';
import { Icona } from '@/components/Icona';
import { tonoPagamento } from '@/lib/domain';
import { fmtDate, fmtEuro, inputDate, nomeCompleto, umanizza } from '@/lib/format';
import { Badge, Campo, Elenco, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { segnaNonGestito, segnaPagato, tornaDaGestire } from '@/actions/pagamenti';
import { AzioneBottone } from '@/components/AzioneBottone';

export const dynamic = 'force-dynamic';

const FILTRI = {
  dagestire: 'Da confermare',
  aperti: 'Da incassare',
  pagati: 'Incassati',
  fuori: 'Gestiti fuori',
  tutti: 'Tutti',
} as const;

type Filtro = keyof typeof FILTRI;

/** Chi aspetta una mossa: ha detto di aver pagato, o c'è un rimborso da restituire. */
const DA_GESTIRE: Prisma.PaymentWhereInput = {
  OR: [
    { status: { not: 'PAGATO' }, dichiaratoIl: { not: null } },
    { tipo: 'RIMBORSO', status: { notIn: ['PAGATO', 'ANNULLATO'] } },
  ],
};

/**
 * La cassa di chi non è la segreteria del club.
 *
 * Mario tiene un corso e incassa lui: qui trova **solo** i pagamenti che
 * finiscono nella sua cassa — chi deve pagare, chi dice di averlo fatto, chi
 * ha già pagato — e li conferma. Della cassa del club non vede niente, e la
 * pagina non esiste per chi non gestisce nessuna cassa.
 */
export default async function CassaPage({
  searchParams,
}: {
  searchParams: Promise<{ cassa?: string; filtro?: string }>;
}) {
  const me = await requireUser();
  const casse = await casseGestite(me.id);
  if (casse.length === 0) notFound();

  const sp = await searchParams;
  const cassa = casse.find((c) => c.id === sp.cassa) ?? casse[0];
  const dellaCassa = { cassaId: cassa.id };

  // si apre su quello che aspetta una conferma, se c'è
  const inSospeso = await prisma.payment.count({ where: { ...dellaCassa, ...DA_GESTIRE } });
  const filtro = (
    Object.keys(FILTRI).includes(sp.filtro ?? '')
      ? sp.filtro
      : inSospeso > 0
        ? 'dagestire'
        : 'aperti'
  ) as Filtro;

  const dove: Prisma.PaymentWhereInput =
    filtro === 'dagestire'
      ? DA_GESTIRE
      : filtro === 'aperti'
        ? { status: { in: ['DA_PAGARE', 'PARZIALE'] }, tipo: { not: 'RIMBORSO' } }
        : filtro === 'pagati'
          ? { status: 'PAGATO' }
          : filtro === 'fuori'
            ? { status: 'NON_GESTITO' }
            : {};

  const [pagamenti, tutti, metodi] = await Promise.all([
    prisma.payment.findMany({
      where: { ...dellaCassa, ...dove },
      orderBy: [{ scadenza: 'asc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: {
            nome: true,
            cognome: true,
            callsign: true,
            telefono: true,
            consensoComunicaz: true,
          },
        },
        event: { select: { id: true, titolo: true } },
        metodo: { select: { nome: true } },
      },
    }),
    prisma.payment.findMany({
      where: dellaCassa,
      select: { importo: true, pagato: true, status: true, tipo: true, dichiaratoIl: true },
    }),
    prisma.metodoPagamento.findMany({
      where: { ...dellaCassa, attivo: true },
      orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, istruzioni: true, selfService: true },
    }),
  ]);

  const quote = tutti.filter((p) => p.tipo !== 'RIMBORSO');
  const aperte = quote.filter((p) => p.status === 'DA_PAGARE' || p.status === 'PARZIALE');
  const daIncassare = aperte.reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0);
  const incassato = quote.reduce((t, p) => t + Number(p.pagato), 0);
  const daConfermare = tutti.filter((p) => p.status !== 'PAGATO' && p.dichiaratoIl).length;

  // come si paga, da mettere nel messaggio: i metodi che chi paga usa da sé
  const comePagare = metodi
    .filter((m) => m.selfService && m.istruzioni)
    .map((m) => `${m.nome}: ${m.istruzioni}`)
    .join('\n');

  /**
   * Il sollecito parte dal telefono di chi gestisce la cassa, con il suo
   * WhatsApp: il collegamento del gestionale è il numero del club, e una quota
   * del corso la ricorda chi lo tiene. Il messaggio arriva già scritto, e si
   * manda solo a chi ha dato il consenso alle comunicazioni, come fa il club.
   */
  const sollecito = (p: (typeof pagamenti)[number]) => {
    const aperta = p.status === 'DA_PAGARE' || p.status === 'PARZIALE';
    if (p.tipo === 'RIMBORSO' || !aperta || p.dichiaratoIl) return null;
    const numero = numeroInternazionale(p.user.telefono);
    if (!numero || !p.user.consensoComunicaz) return { link: null };
    const resto = Number(p.importo) - Number(p.pagato);
    const testo = [
      `Ciao ${p.user.nome}, ti ricordo la quota «${p.descrizione}» di ${fmtEuro(resto)}` +
        (p.scadenza ? `, in scadenza il ${fmtDate(p.scadenza)}.` : '.'),
      comePagare ? `Puoi pagare così:\n${comePagare}` : null,
      'Quando hai pagato, segnalalo nel gestionale da «I miei pagamenti». Grazie!',
    ]
      .filter(Boolean)
      .join('\n\n');
    return { link: `https://wa.me/${numero}?text=${encodeURIComponent(testo)}` };
  };

  const indirizzo = (f: Filtro) =>
    `/cassa?${new URLSearchParams({ ...(casse.length > 1 ? { cassa: cassa.id } : {}), filtro: f })}`;

  return (
    <>
      <Intestazione
        titolo={cassa.nome}
        sottotitolo="La tua cassa: solo i pagamenti che finiscono qui, niente di quelli del club"
        azioni={
          casse.length > 1 ? (
            <div className="flex flex-wrap rounded-md border border-line p-0.5">
              {casse.map((c) => (
                <Link
                  key={c.id}
                  href={`/cassa?cassa=${c.id}`}
                  className={`rounded px-3 py-1.5 text-xs ${
                    c.id === cassa.id ? 'bg-nvg/15 text-nvg' : 'text-muted'
                  }`}
                >
                  {c.nome}
                </Link>
              ))}
            </div>
          ) : undefined
        }
      />

      {!cassa.attiva && (
        <p className="mb-4 rounded-md border border-line bg-surface2 px-4 py-2.5 text-xs text-muted">
          Questa cassa è spenta: non riceve quote nuove, ma quelle che ci sono restano qui.
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Statistica
          etichetta="Da incassare"
          valore={fmtEuro(daIncassare)}
          dettaglio={`${aperte.length} ${aperte.length === 1 ? 'quota aperta' : 'quote aperte'}`}
          tono={daIncassare > 0 ? 'warn' : 'ok'}
        />
        <Statistica
          etichetta="Da confermare"
          valore={daConfermare}
          dettaglio="hanno detto di aver pagato"
          tono={daConfermare > 0 ? 'warn' : 'neutro'}
        />
        <Statistica etichetta="Incassato" valore={fmtEuro(incassato)} tono="ok" />
      </div>

      {metodi.length === 0 && (
        <p className="mb-5 rounded-md border border-warn/40 bg-warn/10 px-4 py-2.5 text-sm text-warn">
          Questa cassa non ha ancora metodi di pagamento: chi deve pagare non sa come farlo. Li
          aggiunge la segreteria.
        </p>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(FILTRI) as Filtro[]).map((f) => (
          <Link
            key={f}
            href={indirizzo(f)}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              filtro === f ? 'border-nvg/40 bg-nvg/10 text-nvg' : 'border-line text-muted'
            }`}
          >
            {FILTRI[f]}
            {f === 'dagestire' && inSospeso > 0 && (
              <span className="num ml-1.5 rounded-full bg-warn/25 px-1.5 text-[10px] text-warn">
                {inSospeso}
              </span>
            )}
          </Link>
        ))}
      </div>

      {pagamenti.length === 0 ? (
        <Vuoto testo="Nessun pagamento in questa vista." />
      ) : (
        <Elenco
          cards={pagamenti.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{nomeCompleto(p.user)}</h3>
                  <p className="truncate text-xs text-muted">{p.descrizione}</p>
                  {p.event && (
                    <Link
                      href={`/calendario/${p.event.id}`}
                      className="text-xs text-muted hover:text-nvg"
                    >
                      {p.event.titolo}
                    </Link>
                  )}
                </div>
                <Stato pagamento={p} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="num text-sm">
                  {fmtEuro(Number(p.pagato))} / {fmtEuro(Number(p.importo))}
                </span>
                <span className="flex items-center justify-end gap-2">
                  <Sollecita invito={sollecito(p)} />
                  <FuoriGestionale pagamento={p} />
                  <Incassa pagamento={p} metodi={metodi} />
                </span>
              </div>
            </div>
          ))}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Chi</th>
                  <th>Voce</th>
                  <th>Scadenza</th>
                  <th>Importo</th>
                  <th>Incassato</th>
                  <th>Stato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagamenti.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{nomeCompleto(p.user)}</td>
                    <td>
                      {p.descrizione}
                      {p.event && (
                        <Link
                          href={`/calendario/${p.event.id}`}
                          className="block text-[11px] text-muted hover:text-nvg"
                        >
                          {p.event.titolo}
                        </Link>
                      )}
                      {p.metodo && (
                        <span className="block text-[11px] text-muted">{p.metodo.nome}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-muted num">{fmtDate(p.scadenza)}</td>
                    <td className="whitespace-nowrap num">{fmtEuro(Number(p.importo))}</td>
                    <td className="whitespace-nowrap num text-muted">
                      {fmtEuro(Number(p.pagato))}
                    </td>
                    <td>
                      <Stato pagamento={p} />
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <span className="flex items-center justify-end gap-2">
                  <Sollecita invito={sollecito(p)} />
                  <FuoriGestionale pagamento={p} />
                  <Incassa pagamento={p} metodi={metodi} />
                </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />
      )}
    </>
  );
}

function Stato({
  pagamento,
}: {
  pagamento: { status: string; tipo: string; dichiaratoIl: Date | null; pagatoIl: Date | null };
}) {
  if (pagamento.status !== 'PAGATO' && pagamento.dichiaratoIl) {
    return (
      <span className="text-right">
        <Badge tono="info">Da confermare</Badge>
        <span className="num mt-0.5 block text-[11px] text-muted">
          segnalato {fmtDate(pagamento.dichiaratoIl)}
        </span>
      </span>
    );
  }
  return (
    <span className="text-right">
      <Badge tono={tonoPagamento[pagamento.status] ?? 'neutro'}>
        {pagamento.tipo === 'RIMBORSO' && pagamento.status !== 'PAGATO'
          ? 'rimborso da erogare'
          : umanizza(pagamento.status)}
      </Badge>
      {pagamento.pagatoIl && (
        <span className="num mt-0.5 block text-[11px] text-muted">
          il {fmtDate(pagamento.pagatoIl)}
        </span>
      )}
    </span>
  );
}

/**
 * La conferma dell'incasso: importo, data e metodo, già compilati con quello
 * che ha dichiarato chi ha pagato. Niente «elimina»: una quota del corso non
 * sparisce con un clic, e quelle che non servono più le toglie l'attività da
 * sola quando uno smette di parteciparvi.
 */
function Incassa({
  pagamento,
  metodi,
}: {
  pagamento: {
    id: string;
    tipo: string;
    status: string;
    importo: unknown;
    descrizione: string;
    dichiaratoIl: Date | null;
    metodoId: string | null;
  };
  metodi: { id: string; nome: string }[];
}) {
  if (
    pagamento.status === 'PAGATO' ||
    pagamento.status === 'ANNULLATO' ||
    pagamento.status === 'NON_GESTITO'
  ) {
    return <span className="text-xs text-muted">—</span>;
  }

  const dovuto = Number(pagamento.importo);
  const rimborso = pagamento.tipo === 'RIMBORSO';

  return (
    <BottoneModale
      etichetta={rimborso ? 'Eroga' : 'Incassa'}
      icona="incassa"
      titolo={`${rimborso ? 'Eroga il rimborso' : 'Registra l’incasso'} · ${pagamento.descrizione}`}
      className="btn-ghost btn-sm"
    >
      <FormAzione azione={segnaPagato}>
        <input type="hidden" name="id" value={pagamento.id} />

        {pagamento.dichiaratoIl && (
          <p className="rounded-md border border-sky-400/40 bg-sky-400/10 px-3 py-2 text-xs text-sky-300">
            Ha segnalato il pagamento il {fmtDate(pagamento.dichiaratoIl)}. Controlla che sia
            arrivato e conferma.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label={rimborso ? 'Erogato (€)' : 'Incassato (€)'}>
            <input
              name="pagato"
              type="number"
              step="0.01"
              min="0"
              max={dovuto}
              defaultValue={dovuto}
              className="input"
            />
          </Campo>

          <Campo label="Data">
            <input
              type="date"
              name="pagatoIl"
              defaultValue={inputDate(pagamento.dichiaratoIl ?? new Date())}
              className="input"
            />
          </Campo>

          <Campo label="Metodo">
            <select name="metodoId" defaultValue={pagamento.metodoId ?? ''} className="input">
              <option value="">— non indicato —</option>
              {metodi.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo label="Note" span>
          <input name="note" className="input" placeholder="Riferimento, numero ricevuta…" />
        </Campo>

        <Invia icona="incassa">{rimborso ? 'Registra l’erogazione' : 'Registra l’incasso'}</Invia>
        <p className="text-xs text-muted">
          Un importo inferiore al dovuto resta come acconto. A saldo completo il movimento non
          sarà più modificabile.
        </p>
      </FormAzione>
    </BottoneModale>
  );
}

/** Il sollecito dal WhatsApp di chi gestisce la cassa: si apre con il messaggio già scritto. */
function Sollecita({ invito }: { invito: { link: string | null } | null }) {
  if (!invito) return null;
  if (!invito.link) {
    return (
      <span
        className="text-[11px] text-muted"
        title="Senza numero in scheda o senza consenso alle comunicazioni"
      >
        non sollecitabile
      </span>
    );
  }
  return (
    <a href={invito.link} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
      <Icona nome="whatsapp" size={15} />
      Sollecita
    </a>
  );
}

/** «Non gestito» e il suo ripensamento, come in Pagamenti. */
function FuoriGestionale({
  pagamento,
}: {
  pagamento: { id: string; tipo: string; status: string; pagato: unknown };
}) {
  if (pagamento.status === 'NON_GESTITO') {
    return (
      <AzioneBottone
        azione={tornaDaGestire}
        valori={{ id: pagamento.id }}
        className="text-xs text-muted hover:text-nvg"
      >
        torna da gestire
      </AzioneBottone>
    );
  }
  if (
    pagamento.status !== 'DA_PAGARE' ||
    pagamento.tipo === 'RIMBORSO' ||
    Number(pagamento.pagato) > 0
  ) {
    return null;
  }
  return (
    <AzioneBottone
      azione={segnaNonGestito}
      valori={{ id: pagamento.id }}
      conferma="Segnarla come gestita fuori dal gestionale? Conterà come pagata, ma in cassa non entrerà niente."
      className="text-xs text-muted hover:text-nvg"
    >
      non gestito
    </AzioneBottone>
  );
}
