import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fmtDateTime, nomeCompleto } from '@/lib/format';
import { QUANDO, SEGNAPOSTO_CERTIFICATO, type Quando } from '@/lib/email-certificati';
import { gruppiWhatsapp, statoPonte } from '@/lib/whatsapp';
import { Badge } from '@/components/ui';
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
} from '@/actions/email-certificati';
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
  const [posta, regole, invii] = await Promise.all([
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

      <div className="mb-4 flex justify-end">
        <BottoneModale etichetta="Nuova email" icona="aggiungi" titolo="Nuova email" larga>
          <FormAzione azione={salvaEmailCertificato}>
            <CampiEmailCertificato segnaposto={SEGNAPOSTO_CERTIFICATO} />
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
                            larga
                          >
                            <FormAzione azione={salvaEmailCertificato}>
                              <input type="hidden" name="id" value={r.id} />
                              <CampiEmailCertificato
                                valori={r}
                                segnaposto={SEGNAPOSTO_CERTIFICATO}
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
