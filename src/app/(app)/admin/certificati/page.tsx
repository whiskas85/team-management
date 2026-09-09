import Link from 'next/link';
import type { StatoOperatore } from '@prisma/client';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elencoOperatori } from '@/lib/query';
import {
  GIORNI_PREAVVISO_SCADENZA,
  puoAmministrare,
  statoEffettivo,
  tonoCertificato,
} from '@/lib/domain';
import { fmtDate, giorniA, inputDate, nomeCompleto, umanizza } from '@/lib/format';
import { Badge, Campo, Elenco, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { DateCertificato } from '@/components/DateCertificato';
import { Icona } from '@/components/Icona';
import { AzioneBottone } from '@/components/AzioneBottone';
import {
  approvaCertificato,
  caricaCertificato,
  eliminaCertificato,
  rifiutaCertificato,
} from '@/actions/certificati';

const FILTRI = {
  attesa: 'Da vagliare',
  scadenza: 'In scadenza',
  scaduti: 'Scaduti',
  // Chi un certificato non l'ha mai caricato non ha una riga da nessuna parte,
  // e per questo da questa pagina era invisibile: si vedevano i certificati,
  // non le persone senza. Ma «non ce l'ha ancora» e «ce l'ha scaduto» sono lo
  // stesso problema per chi deve schierare — anzi il primo è peggio, perché
  // non se ne accorge nessuno.
  mancanti: 'Senza certificato',
  validi: 'Validi',
  tutti: 'Tutti',
} as const;

type Filtro = keyof typeof FILTRI;

function condizione(filtro: Filtro) {
  const ora = new Date();
  const limite = new Date(Date.now() + GIORNI_PREAVVISO_SCADENZA * 86400000);
  switch (filtro) {
    case 'attesa':
      return { status: 'IN_ATTESA' as const };
    case 'scadenza':
      return { status: 'VALIDO' as const, scadeIl: { gte: ora, lte: limite } };
    case 'scaduti':
      return {
        OR: [{ status: 'SCADUTO' as const }, { status: 'VALIDO' as const, scadeIl: { lt: ora } }],
      };
    case 'validi':
      return { status: 'VALIDO' as const, scadeIl: { gte: ora } };
    default:
      return {};
  }
}

export default async function CertificatiPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  await requirePermesso(puoAmministrare);
  const sp = await searchParams;
  const filtro = (Object.keys(FILTRI).includes(sp.filtro ?? '') ? sp.filtro : 'attesa') as Filtro;

  // Chi in rosa non ha **nessun** certificato caricato. Si conta sempre, anche
  // guardando un'altra vista: è il numero che nessuno andrebbe a cercare, e
  // messo sul filtro si vede senza doverci pensare.
  const senzaCertificato = {
    stato: { in: ['SQUADRA', 'SOSPESO'] as StatoOperatore[] },
    certificates: { none: {} },
  };

  const [certificati, mancanti, operatori, inAttesa] = await Promise.all([
    filtro === 'mancanti'
      ? []
      : prisma.medicalCertificate.findMany({
          where: condizione(filtro),
          orderBy: [{ status: 'asc' }, { scadeIl: 'asc' }],
          include: {
            user: { select: { id: true, nome: true, cognome: true, callsign: true } },
          },
        }),
    prisma.user.findMany({
      where: senzaCertificato,
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, cognome: true, callsign: true, stato: true },
    }),
    elencoOperatori(true),
    prisma.medicalCertificate.count({ where: { status: 'IN_ATTESA' } }),
  ]);

  return (
    <>
      <Intestazione
        titolo="Certificati medici"
        sottotitolo={`${inAttesa} da approvare · preavviso scadenza ${GIORNI_PREAVVISO_SCADENZA} giorni`}
        azioni={
          <BottoneModale etichetta="Carica per un operatore" icona="carica" titolo="Carica certificato">
            <FormAzione azione={caricaCertificato}>
              <Campo label="Operatore *">
                <select name="userId" required className="input" defaultValue="">
                  <option value="">— seleziona —</option>
                  {operatori.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.cognome} {g.nome}
                      {g.callsign ? ` · ${g.callsign}` : ''}
                    </option>
                  ))}
                </select>
              </Campo>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Campo label="Tipo">
                  <select name="tipo" className="input" defaultValue="NON_AGONISTICO">
                    <option value="NON_AGONISTICO">Non agonistico</option>
                    <option value="AGONISTICO">Agonistico</option>
                  </select>
                </Campo>
                <DateCertificato />
              </div>
              <Campo label="File *">
                <input
                  type="file"
                  name="file"
                  required
                  accept="application/pdf,image/*"
                  className="input file:mr-3 file:rounded file:border-0 file:bg-nvg/15 file:px-3 file:py-1 file:text-nvg"
                />
              </Campo>
              <Invia icona="carica">
            Carica
          </Invia>
            </FormAzione>
          </BottoneModale>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(FILTRI) as Filtro[]).map((f) => (
          <Link
            key={f}
            href={`/admin/certificati?filtro=${f}`}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              filtro === f ? 'border-nvg/40 bg-nvg/10 text-nvg' : 'border-line text-muted'
            }`}
          >
            {FILTRI[f]}
            {/* quanti sono si legge senza entrarci: un elenco che non si apre
                non avvisa nessuno */}
            {f === 'mancanti' && mancanti.length > 0 && (
              <span className="num ml-1.5 rounded-full bg-danger/20 px-1.5 text-[10px] text-danger">
                {mancanti.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {filtro === 'mancanti' ? (
        mancanti.length === 0 ? (
          <Vuoto testo="Sono tutti coperti: in rosa non c'è nessuno senza certificato caricato." />
        ) : (
          <>
            <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              <strong>
                {mancanti.length === 1
                  ? 'Una persona in rosa non ha mai caricato un certificato'
                  : `${mancanti.length} persone in rosa non hanno mai caricato un certificato`}
              </strong>
              . Senza, non si segnano alle attività che lo richiedono: se ne accorgono la domenica
              mattina, ed è tardi.
            </div>

            <Elenco
              cards={mancanti.map((o) => (
                <div key={o.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{nomeCompleto(o)}</h3>
                      <p className="text-xs text-muted">{umanizza(o.stato)}</p>
                    </div>
                    <Badge tono="danger">mancante</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    <AzioniMancante operatore={o} />
                  </div>
                </div>
              ))}
              tabella={
                <table className="tabella">
                  <thead>
                    <tr>
                      <th>Operatore</th>
                      <th>Stato</th>
                      <th>Certificato</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mancanti.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link
                            href={`/admin/operatori/${o.id}`}
                            className="font-medium hover:text-nvg"
                          >
                            {o.cognome} {o.nome}
                          </Link>
                          {o.callsign && (
                            <span className="num text-[11px] text-muted"> · {o.callsign}</span>
                          )}
                        </td>
                        <td className="text-muted">{umanizza(o.stato)}</td>
                        <td>
                          <Badge tono="danger">mai caricato</Badge>
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex gap-2">
                            <AzioniMancante operatore={o} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            />
          </>
        )
      ) : certificati.length === 0 ? (
        <Vuoto testo="Nessun certificato in questa vista." />
      ) : (
        <Elenco
          cards={certificati.map((c) => {
            const stato = statoEffettivo(c);
            return (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{nomeCompleto(c.user)}</h3>
                    <p className="text-xs text-muted num">
                      {umanizza(c.tipo)} · scade {fmtDate(c.scadeIl)}
                    </p>
                  </div>
                  <Badge tono={tonoCertificato[stato]}>{umanizza(stato)}</Badge>
                </div>
                <Azioni cert={c} stato={stato} />
              </div>
            );
          })}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Operatore</th>
                  <th>Tipo</th>
                  <th>Rilascio</th>
                  <th>Scadenza</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {certificati.map((c) => {
                  const stato = statoEffettivo(c);
                  const g = giorniA(c.scadeIl);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link
                          href={`/admin/operatori/${c.user.id}`}
                          className="font-medium hover:text-nvg"
                        >
                          {c.user.cognome} {c.user.nome}
                        </Link>
                      </td>
                      <td className="text-muted">{umanizza(c.tipo)}</td>
                      <td className="whitespace-nowrap text-muted num">{fmtDate(c.rilasciatoIl)}</td>
                      <td className="whitespace-nowrap num">
                        {fmtDate(c.scadeIl)}
                        {stato === 'VALIDO' && g !== null && g <= GIORNI_PREAVVISO_SCADENZA && (
                          <span className="block text-[11px] text-warn">fra {g} giorni</span>
                        )}
                      </td>
                      <td>
                        <Badge tono={tonoCertificato[stato]}>{umanizza(stato)}</Badge>
                      </td>
                      <td className="min-w-[320px]">
                        <Azioni cert={c} stato={stato} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          }
        />
      )}
    </>
  );
}

function Azioni({
  cert,
  stato,
}: {
  cert: {
    id: string;
    rilasciatoIl: Date | null;
    scadeIl: Date | null;
    motivoRifiuto: string | null;
  };
  stato: string;
}) {
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3 md:mt-0 md:border-0 md:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/api/certificati/${cert.id}`}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost btn-sm"
        >
          <Icona nome="apri" size={15} /> Apri allegato
        </a>

        {/* Un doppione si toglie, non si boccia: rifiutarlo lascerebbe in
            elenco una riga rossa che racconta una bocciatura mai avvenuta. */}
        <AzioneBottone
          azione={eliminaCertificato}
          valori={{ id: cert.id }}
          icona="elimina"
          conferma={
            stato === 'VALIDO'
              ? 'Eliminare questo certificato? Era valido: se è l’unico, la persona risulterà scoperta.'
              : 'Eliminare questo certificato? Sparisce anche il file allegato.'
          }
          className="btn-danger btn-sm"
        >
          Elimina
        </AzioneBottone>
      </div>

      {cert.motivoRifiuto && <p className="text-xs text-danger">Rifiutato: {cert.motivoRifiuto}</p>}

      {stato === 'IN_ATTESA' && (
        <div className="space-y-2">
          <FormAzione azione={approvaCertificato} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={cert.id} />
            <DateCertificato rilascioIniziale={inputDate(cert.rilasciatoIl)} compatto />
            <Invia className="btn-primary btn-sm" icona="approva">
              Approva
            </Invia>
          </FormAzione>

          <FormAzione azione={rifiutaCertificato} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={cert.id} />
            <input
              name="motivoRifiuto"
              className="input min-w-[160px] flex-1"
              placeholder="Motivo del rifiuto"
            />
            <Invia className="btn-danger btn-sm" icona="rifiuta">
            Rifiuta
          </Invia>
          </FormAzione>
        </div>
      )}
    </div>
  );
}

/**
 * Cosa si può fare per chi il certificato non ce l'ha.
 *
 * Due strade, ed è giusto che siano due: **caricarlo qui** quando la persona
 * te l'ha mandato per messaggio — è il caso di gran lunga più frequente — o
 * aprire la sua scheda per il resto. La persona è già scelta: da un elenco di
 * chi manca, ricercarsi il nome in una tendina di venti è lavoro inutile.
 */
function AzioniMancante({
  operatore,
}: {
  operatore: { id: string; nome: string; cognome: string; callsign: string | null };
}) {
  return (
    <>
      <BottoneModale
        etichetta="Carica"
        icona="carica"
        titolo={`Certificato di ${nomeCompleto(operatore)}`}
        className="btn-primary btn-sm"
      >
        <FormAzione azione={caricaCertificato}>
          <input type="hidden" name="userId" value={operatore.id} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo label="Tipo">
              <select name="tipo" className="input" defaultValue="NON_AGONISTICO">
                <option value="NON_AGONISTICO">Non agonistico</option>
                <option value="AGONISTICO">Agonistico</option>
              </select>
            </Campo>
            <DateCertificato />
          </div>
          <Campo label="File *">
            <input
              type="file"
              name="file"
              required
              accept="application/pdf,image/*"
              className="input file:mr-3 file:rounded file:border-0 file:bg-nvg/15 file:px-3 file:py-1 file:text-nvg"
            />
          </Campo>
          <Invia icona="carica">Carica</Invia>
        </FormAzione>
      </BottoneModale>

      <Link href={`/admin/operatori/${operatore.id}`} className="btn-ghost btn-sm">
        <Icona nome="apri" size={15} />
        Scheda
      </Link>
    </>
  );
}
