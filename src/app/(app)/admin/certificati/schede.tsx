import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fmtDateTime, nomeCompleto } from '@/lib/format';
import { QUANDO, SEGNAPOSTO_CERTIFICATO, type Quando } from '@/lib/email-certificati';
import { SEGNO_STILE } from '@/lib/email-corpo';
import { gruppiWhatsapp, statoPonte } from '@/lib/whatsapp';
import { Badge, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { BottoneElimina, CardRiga } from '@/components/CardRiga';
import { CampiEmailCertificato } from '@/components/CampiEmailCertificato';
import { CodaWhatsapp, ModelliWhatsapp } from '@/components/ModelliWhatsapp';
import {
  accendiEmailCertificato,
  eliminaEmailCertificato,
  provaEmailCertificatoAMe,
  salvaEmailCertificato,
  stileSquadraTutte,
} from '@/actions/email-certificati';
import { stileDellaSquadra } from '@/lib/email-stile';
import { preparaSollecito } from '@/actions/messaggi';

/** Le schede in cima alla pagina dei certificati. */
export function BarraSchede({
  schede,
  attiva,
}: {
  schede: { chiave: string; titolo: string }[];
  attiva: string;
}) {
  return (
    <div
      role="tablist"
      className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-line px-1 [scrollbar-width:none]"
    >
      {schede.map((s) => (
        <Link
          key={s.chiave}
          href={
            s.chiave === 'certificati'
              ? '/admin/certificati'
              : `/admin/certificati?scheda=${s.chiave}`
          }
          role="tab"
          aria-selected={s.chiave === attiva}
          scroll={false}
          className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
            s.chiave === attiva
              ? 'border-nvg font-medium text-nvg'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          {s.titolo}
        </Link>
      ))}
    </div>
  );
}

/**
 * Le email automatiche: all'approvazione e prima della scadenza, ognuna coi
 * suoi destinatari e il suo testo. Sotto, il registro di quelle partite.
 */
export async function SchedaMail() {
  const [stile, posta, regole, invii] = await Promise.all([
    stileDellaSquadra(),
    prisma.serverPosta.findFirst({ where: { attivo: true }, select: { id: true } }),
    prisma.emailCertificato.findMany({ orderBy: [{ giorni: 'desc' }, { createdAt: 'asc' }] }),
    prisma.invioEmailCertificato.findMany({
      orderBy: { inviatoIl: 'desc' },
      take: 20,
      include: {
        regola: { select: { quando: true, giorni: true, oggetto: true } },
        certificato: { select: { user: { select: { nome: true, cognome: true } } } },
      },
    }),
  ]);

  const gruppi: { quando: Quando; spiega: string }[] = [
    {
      quando: 'ACCETTATO',
      spiega:
        'Partono appena premi Approva. Di solito a chi archivia i certificati, col file in allegato.',
    },
    {
      quando: 'SCADENZA',
      spiega:
        'Partono di giorno, quando mancano quei giorni alla scadenza. Con più email (30, 10, 0) parte quella della tappa raggiunta; chi ha già rinnovato non riceve niente.',
    },
  ];

  return (
    <>
      {!posta && (
        <div className="mb-5 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          Nessun server di posta collegato: le email si possono preparare, ma non partono finché non
          lo colleghi in{' '}
          <Link href="/admin/posta" className="underline">
            Posta
          </Link>
          .
        </div>
      )}

      <div className="mb-4 flex flex-wrap justify-end gap-2">
        {regole.some(
          (r) => (r.formato !== 'HTML' && !r.stileSquadra) || r.testo.includes(SEGNO_STILE),
        ) && (
          <AzioneBottone
            azione={stileSquadraTutte}
            valori={{}}
            className="btn-ghost"
            conferma="Accendere lo stile della squadra su tutte le email in Markdown o testo semplice? Il testo non cambia: la cornice (nome, firma col logo, «non rispondere») si mette quando l’email parte. Quelle che hanno la cornice scritta dentro tornano al loro Markdown, senza i pezzi di cornice accumulati."
          >
            ✦ Stile della squadra a tutte
          </AzioneBottone>
        )}
        <BottoneModale etichetta="Nuova email" icona="aggiungi" titolo="Nuova email" larga="molto">
          <FormAzione azione={salvaEmailCertificato}>
            <CampiEmailCertificato segnaposto={SEGNAPOSTO_CERTIFICATO} stile={stile} />
            <Invia icona="salva">Crea</Invia>
          </FormAzione>
        </BottoneModale>
      </div>

      <div className="space-y-6">
        {gruppi.map((g) => {
          const sue = regole.filter((r) => r.quando === g.quando);
          return (
            <div key={g.quando}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
                {QUANDO[g.quando]} · {sue.length}
              </p>
              <p className="mb-2 text-xs text-muted">{g.spiega}</p>
              {sue.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-3 text-xs text-muted">
                  Nessuna email.
                </p>
              ) : (
                <div className="space-y-3">
                  {sue.map((r) => (
                    <CardRiga
                      key={r.id}
                      className={r.attivo ? '' : 'opacity-60'}
                      titolo={r.oggetto}
                      sottotitolo={
                        <span className="flex flex-wrap items-center gap-2">
                          {r.quando === 'SCADENZA' && (
                            <Badge tono="warn">
                              {r.giorni === 0
                                ? 'il giorno della scadenza'
                                : `${r.giorni} ${r.giorni === 1 ? 'giorno' : 'giorni'} prima`}
                            </Badge>
                          )}
                          {r.stileSquadra && <Badge tono="ok">stile della squadra</Badge>}
                          {r.testo.includes(SEGNO_STILE) && (
                            <Badge tono="warn">cornice scritta dentro</Badge>
                          )}
                          {r.formato !== 'TESTO' && (
                            <Badge tono="neutro">
                              {r.formato === 'HTML' ? 'HTML' : 'Markdown'}
                            </Badge>
                          )}
                          {r.allegato && <Badge tono="info">con allegato</Badge>}
                          {!r.attivo && <Badge tono="neutro">spenta</Badge>}
                          <span className="break-all">
                            a{' '}
                            {[r.allInteressato ? 'la persona' : null, r.destinatari || null]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </span>
                      }
                      elimina={
                        <BottoneElimina
                          azione={eliminaEmailCertificato}
                          valori={{ id: r.id }}
                          conferma={`Eliminare l’email «${r.oggetto}»?`}
                          etichetta="Elimina l’email"
                        />
                      }
                      azioni={
                        <>
                          <BottoneModale
                            etichetta="Modifica"
                            icona="modifica"
                            titolo="Modifica email"
                            className="btn-ghost btn-sm"
                            larga="molto"
                          >
                            <FormAzione azione={salvaEmailCertificato}>
                              <input type="hidden" name="id" value={r.id} />
                              <CampiEmailCertificato
                                valori={r}
                                segnaposto={SEGNAPOSTO_CERTIFICATO}
                                stile={stile}
                              />
                              <Invia icona="salva">Salva</Invia>
                            </FormAzione>
                          </BottoneModale>
                          <AzioneBottone
                            azione={provaEmailCertificatoAMe}
                            valori={{ id: r.id }}
                            className="btn-ghost btn-sm"
                          >
                            Mandami una prova
                          </AzioneBottone>
                          <AzioneBottone
                            azione={accendiEmailCertificato}
                            valori={{ id: r.id }}
                            className="btn-ghost btn-sm"
                          >
                            {r.attivo ? 'Spegni' : 'Accendi'}
                          </AzioneBottone>
                        </>
                      }
                    >
                      <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted">
                        {r.testo}
                      </p>
                    </CardRiga>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {invii.length > 0 && (
        <div className="mt-8">
          <h2 className="titolo-sezione mb-3">Ultime partite</h2>
          <div className="space-y-2">
            {invii.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs"
              >
                <Badge tono={i.errore ? 'danger' : 'ok'}>{i.errore ? 'errore' : 'partita'}</Badge>
                <span className="font-medium">{nomeCompleto(i.certificato.user)}</span>
                <span className="text-muted">
                  {i.regola.quando === 'SCADENZA'
                    ? `scadenza −${i.regola.giorni}g`
                    : 'approvazione'}{' '}
                  · a {i.aChi}
                </span>
                <span className="num ml-auto text-muted">{fmtDateTime(i.inviatoIl)}</span>
                {i.errore && <span className="w-full break-words text-danger">{i.errore}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * I messaggi WhatsApp del certificato in scadenza: stavano in Messaggi, ora
 * qui accanto alle scadenze. Il collegamento del numero resta in Messaggi.
 */
export async function SchedaWhatsapp({ meId }: { meId: string }) {
  const [ponte, collegamento, modelli, coda] = await Promise.all([
    statoPonte(),
    prisma.collegamentoWhatsapp.findUnique({ where: { id: 'whatsapp' } }),
    prisma.modelloMessaggio.findMany({
      where: { scatenante: 'CERTIFICATO_IN_SCADENZA' },
      orderBy: { createdAt: 'asc' },
      include: { testi: { orderBy: { createdAt: 'asc' } } },
    }),
    prisma.messaggioInviato.findMany({
      where: { stato: 'DA_MANDARE', scatenante: 'CERTIFICATO_IN_SCADENZA' },
      orderBy: { creatoIl: 'asc' },
    }),
  ]);
  const mio = collegamento?.utenteId === meId;
  const gruppi = ponte.collegato && mio ? await gruppiWhatsapp() : [];

  return (
    <>
      {!(ponte.collegato && mio) && (
        <div className="mb-5 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {ponte.collegato
            ? 'WhatsApp è collegato al numero di un altro amministratore: i messaggi li manda lui.'
            : 'WhatsApp non è collegato.'}{' '}
          Il numero si collega in{' '}
          <Link href="/admin/messaggi" className="underline">
            Messaggi
          </Link>
          .
        </div>
      )}

      <div className="card mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="titolo-sezione">Da mandare</p>
          <FormAzione azione={preparaSollecito} className="contents">
            <input type="hidden" name="scatenante" value="CERTIFICATO_IN_SCADENZA" />
            <Invia icona="certificato" className="btn-ghost btn-sm">
              Prepara i certificati in scadenza
            </Invia>
          </FormAzione>
        </div>
        <CodaWhatsapp coda={coda} scatenante="CERTIFICATO_IN_SCADENZA" />
      </div>

      <ModelliWhatsapp modelli={modelli} gruppi={gruppi} ordine={['CERTIFICATO_IN_SCADENZA']} />
    </>
  );
}

const CANALI = {
  tutti: 'Tutti',
  email: 'Email',
  whatsapp: 'WhatsApp',
  notifiche: 'Avvisi automatici',
} as const;
type Canale = keyof typeof CANALI;

/** Come si dice la porta da cui è uscito un avviso automatico. */
const PORTA: Record<string, string> = {
  push: 'notifica',
  whatsapp: 'WhatsApp',
  email: 'email',
  niente: 'non raggiungibile',
};

/**
 * Il registro: tutto quello che è partito per i certificati, a chi e quando.
 *
 * Tre fonti messe in fila per data: le email automatiche (approvazione e
 * scadenza), i messaggi WhatsApp mandati dalla scheda WhatsApp, e gli avvisi
 * di scadenza che il gestionale manda da solo alla persona, come notifica
 * (quelli più vecchi potevano essere usciti anche su WhatsApp o per email).
 */
export async function SchedaLog({ canale, cerca }: { canale?: string; cerca?: string }) {
  const filtro: Canale = canale && canale in CANALI ? (canale as Canale) : 'tutti';
  const q = cerca?.trim() ?? '';
  const perNome = q
    ? {
        OR: [
          { nome: { contains: q, mode: 'insensitive' as const } },
          { cognome: { contains: q, mode: 'insensitive' as const } },
          { callsign: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const QUANTI = 200;
  const vuoto = Promise.resolve([]);

  const [email, whatsapp, avvisi] = await Promise.all([
    filtro === 'tutti' || filtro === 'email'
      ? prisma.invioEmailCertificato.findMany({
          where: q ? { certificato: { user: perNome } } : {},
          orderBy: { inviatoIl: 'desc' },
          take: QUANTI,
          include: {
            regola: { select: { quando: true, giorni: true, oggetto: true } },
            certificato: { select: { user: { select: { id: true, nome: true, cognome: true } } } },
          },
        })
      : vuoto,
    filtro === 'tutti' || filtro === 'whatsapp'
      ? prisma.messaggioInviato.findMany({
          where: {
            scatenante: 'CERTIFICATO_IN_SCADENZA',
            stato: { not: 'DA_MANDARE' },
            ...(q ? { user: perNome } : {}),
          },
          orderBy: { creatoIl: 'desc' },
          take: QUANTI,
          include: { user: { select: { id: true, nome: true, cognome: true } } },
        })
      : vuoto,
    filtro === 'tutti' || filtro === 'notifiche'
      ? prisma.avvisoCertificato.findMany({
          where: q ? { certificato: { user: perNome } } : {},
          orderBy: { inviatoIl: 'desc' },
          take: QUANTI,
          include: {
            certificato: { select: { user: { select: { id: true, nome: true, cognome: true } } } },
          },
        })
      : vuoto,
  ]);

  type Riga = {
    id: string;
    quando: Date;
    canale: 'Email' | 'WhatsApp' | 'Avviso';
    persona: { id: string; nome: string; cognome: string } | null;
    aChi: string;
    cosa: string;
    errore: string | null;
  };
  const righe: Riga[] = [
    ...email.map((i) => ({
      id: `e${i.id}`,
      quando: i.inviatoIl,
      canale: 'Email' as const,
      persona: i.certificato.user,
      aChi: i.aChi,
      cosa:
        (i.regola.quando === 'SCADENZA'
          ? `${i.regola.giorni} giorni prima della scadenza`
          : 'all’approvazione') + ` · «${i.oggetto ?? i.regola.oggetto}»`,
      errore: i.errore,
    })),
    ...whatsapp.map((m) => ({
      id: `w${m.id}`,
      quando: m.inviatoIl ?? m.creatoIl,
      canale: 'WhatsApp' as const,
      persona: m.user,
      aChi: m.aChi,
      cosa: m.testo,
      errore: m.stato === 'ERRORE' ? (m.esito ?? 'non partito') : null,
    })),
    ...avvisi.map((a) => ({
      id: `a${a.id}`,
      quando: a.inviatoIl,
      canale: 'Avviso' as const,
      persona: a.certificato.user,
      aChi: a.canale === 'niente' ? '—' : `alla persona, per ${PORTA[a.canale] ?? a.canale}`,
      cosa: a.titolo,
      errore:
        a.canale === 'niente'
          ? 'Non ha le notifiche accese: non è arrivato.'
          : null,
    })),
  ]
    .sort((a, b) => b.quando.getTime() - a.quando.getTime())
    .slice(0, QUANTI);

  const link = (c: Canale) => {
    const p = new URLSearchParams({ scheda: 'log' });
    if (c !== 'tutti') p.set('canale', c);
    if (q) p.set('q', q);
    return `/admin/certificati?${p}`;
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(CANALI) as Canale[]).map((c) => (
          <Link
            key={c}
            href={link(c)}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              filtro === c ? 'border-nvg/40 bg-nvg/10 text-nvg' : 'border-line text-muted'
            }`}
          >
            {CANALI[c]}
          </Link>
        ))}
        <form action="/admin/certificati" className="ml-auto flex gap-2">
          <input type="hidden" name="scheda" value="log" />
          {filtro !== 'tutti' && <input type="hidden" name="canale" value={filtro} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Cerca una persona"
            className="input h-8 w-44 py-1 text-xs"
          />
          <button type="submit" className="btn-ghost btn-sm">
            Cerca
          </button>
        </form>
      </div>

      {righe.length === 0 ? (
        <Vuoto testo="Ancora niente: qui compare tutto quello che parte per i certificati." />
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">
            {righe.length === QUANTI ? `Gli ultimi ${QUANTI}` : `${righe.length} in tutto`}, dal più
            recente.
          </p>
          <div className="space-y-2">
            {righe.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs"
              >
                <span className="num w-[7.5rem] shrink-0 text-muted">{fmtDateTime(r.quando)}</span>
                <Badge
                  tono={r.canale === 'Email' ? 'info' : r.canale === 'WhatsApp' ? 'ok' : 'neutro'}
                >
                  {r.canale}
                </Badge>
                {r.errore ? <Badge tono="danger">non partito</Badge> : null}
                {r.persona ? (
                  <Link
                    href={`/admin/operatori/${r.persona.id}`}
                    className="font-medium hover:text-nvg"
                  >
                    {nomeCompleto(r.persona)}
                  </Link>
                ) : (
                  <span className="font-medium">—</span>
                )}
                <span className="min-w-0 break-all text-muted">a {r.aChi}</span>
                <span className="w-full min-w-0 break-words text-ink/80 line-clamp-2 whitespace-pre-wrap">
                  {r.cosa}
                </span>
                {r.errore && <span className="w-full break-words text-danger">{r.errore}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
