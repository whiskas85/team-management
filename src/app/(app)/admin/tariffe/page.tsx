import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { fmtEuro } from '@/lib/format';
import { ETICHETTA_VOCE, NOMI_SUGGERITI, SPIEGA_VOCE } from '@/lib/stagioni';
import { Badge, Campo, Elenco, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { eliminaTariffa, salvaTariffa } from '@/actions/stagioni';
import type { VoceTariffa } from '@prisma/client';

const VOCI = Object.keys(ETICHETTA_VOCE) as VoceTariffa[];

type Stagione = { id: string; nome: string };
type CassaScelta = { id: string; nome: string; attiva: boolean };

type RigaTariffa = {
  id: string;
  nome: string;
  usi: VoceTariffa[];
  importo: unknown;
  stagioneId: string | null;
  note: string | null;
  perGiorno: boolean;
  cassaId: string | null;
  perPolizza: boolean;
};

export default async function TariffePage() {
  await requirePermesso(isAdmin);

  const [stagioni, tariffe, casse] = await Promise.all([
    prisma.stagione.findMany({ orderBy: { inizio: 'desc' }, select: { id: true, nome: true } }),
    prisma.tariffa.findMany({
      orderBy: [{ stagioneId: 'asc' }, { nome: 'asc' }],
      include: { stagione: { select: { nome: true } }, cassa: { select: { nome: true } } },
    }),
    prisma.cassa.findMany({
      orderBy: [{ attiva: 'desc' }, { nome: 'asc' }],
      select: { id: true, nome: true, attiva: true },
    }),
  ]);

  // i nomi gia' usati, piu' quelli standard: il campo resta libero ma guidato
  const suggerimenti = [...new Set([...tariffe.map((t) => t.nome), ...NOMI_SUGGERITI])].sort();
  const conAutomatismo = tariffe.filter((t) => t.usi.length > 0).length;

  return (
    <>
      <Intestazione
        titolo="Tariffario"
        sottotitolo="Quanto costa: quote associative, tessere, giocate dei nuovi, noleggi"
        azioni={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/stagioni" className="btn-ghost btn-sm">
              &larr; Stagioni
            </Link>
            <BottoneModale etichetta="Aggiungi tariffa" icona="aggiungi" titolo="Nuova tariffa">
              <FormAzione azione={salvaTariffa}>
                <CampiTariffa stagioni={stagioni} casse={casse} suggerimenti={suggerimenti} />
                <Invia icona="salva">Aggiungi</Invia>
              </FormAzione>
            </BottoneModale>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica etichetta="Voci a listino" valore={tariffe.length} />
        <Statistica
          etichetta="Con automatismo"
          valore={conAutomatismo}
          dettaglio="proposte da sole dove servono"
          tono="ok"
        />
        <Statistica
          etichetta="Valide sempre"
          valore={tariffe.filter((t) => !t.stagioneId).length}
        />
        <Statistica
          etichetta="Legate a una stagione"
          valore={tariffe.filter((t) => t.stagioneId).length}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="titolo-sezione">Tariffario</h2>
        <BottoneModale
          etichetta="Aggiungi tariffa"
          icona="aggiungi"
          titolo="Nuova tariffa"
          className="btn-ghost btn-sm"
        >
          <FormAzione azione={salvaTariffa}>
            <CampiTariffa stagioni={stagioni} casse={casse} suggerimenti={suggerimenti} />
            <Invia icona="salva">Aggiungi</Invia>
          </FormAzione>
        </BottoneModale>
      </div>

      <p className="mb-3 rounded-md border border-line bg-surface2 px-4 py-3 text-xs text-muted">
        Una tariffa <strong className="text-ink">senza stagione</strong> vale sempre: &egrave; il
        prezzo di listino. Aggiungendone una <strong className="text-ink">con la stagione</strong>{' '}
        quella vince, ma solo per quell&rsquo;anno &mdash; cos&igrave; si alza la quota di una
        stagione senza toccare il resto. Senza una <strong className="text-ink">cassa</strong> i
        soldi vanno al club; con un&rsquo;altra cassa, spuntata su un&rsquo;attivit&agrave;, la
        voce diventa la quota di quella cassa.
      </p>

      {tariffe.length === 0 ? (
        <Vuoto testo="Nessuna tariffa impostata: gli importi vanno scritti a mano ogni volta." />
      ) : (
        <Elenco
          cards={tariffe.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium">{t.nome}</h3>
                  <p className="text-xs text-muted">
                    {t.stagione ? `solo ${t.stagione.nome}` : 'vale per tutte le stagioni'}
                  </p>
                  {t.cassa && <p className="text-[11px] text-warn">va a {t.cassa.nome}</p>}
                  {t.perPolizza && (
                    <p className="mt-1">
                      <Badge tono="info">paga la polizza giornaliera</Badge>
                    </p>
                  )}
                  {t.usi.length > 0 && (
                    <p className="mt-1 text-[11px] text-nvg">
                      auto: {t.usi.map((u) => ETICHETTA_VOCE[u]).join(', ')}
                    </p>
                  )}
                  {t.note && <p className="mt-1 text-xs text-muted">{t.note}</p>}
                </div>
                <span className="num shrink-0 font-semibold text-nvg">
                  {fmtEuro(Number(t.importo))}
                  {t.perGiorno && (
                    <span className="text-[11px] font-normal text-muted"> /giorno</span>
                  )}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                <AzioniTariffa
                          tariffa={t}
                          stagioni={stagioni}
                          casse={casse}
                          suggerimenti={suggerimenti}
                        />
              </div>
            </div>
          ))}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Voce</th>
                  <th>Automatismo</th>
                  <th>Vale per</th>
                  <th className="text-right">Importo</th>
                  <th>Note</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {tariffe.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="font-medium">{t.nome}</span>
                      {t.note && <span className="block text-[11px] text-muted">{t.note}</span>}
                    </td>
                    <td>
                      {t.usi.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {t.usi.map((u) => (
                            <Badge key={u} tono="ok">
                              {ETICHETTA_VOCE[u]}
                            </Badge>
                          ))}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted">solo a listino</span>
                      )}
                    </td>
                    <td>
                      {t.stagione ? (
                        <Badge tono="info">{t.stagione.nome}</Badge>
                      ) : (
                        <Badge tono="neutro">tutte</Badge>
                      )}
                      {/* di chi sono i soldi: il club non si scrive, è il solito */}
                      {t.cassa && (
                        <span className="mt-1 block text-[11px] text-warn">va a {t.cassa.nome}</span>
                      )}
                      {t.perPolizza && (
                        <span className="mt-1 block">
                          <Badge tono="info">paga la polizza</Badge>
                        </span>
                      )}
                    </td>
                    <td className="num whitespace-nowrap text-right font-semibold text-nvg">
                      {fmtEuro(Number(t.importo))}
                      {t.perGiorno && (
                        <span className="text-[11px] font-normal text-muted"> /giorno</span>
                      )}
                    </td>
                    <td className="text-xs text-muted">{t.note ?? '-'}</td>
                    <td className="whitespace-nowrap">
                      <div className="flex gap-2">
                        <AzioniTariffa
                          tariffa={t}
                          stagioni={stagioni}
                          casse={casse}
                          suggerimenti={suggerimenti}
                        />
                      </div>
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

function AzioniTariffa({
  tariffa,
  stagioni,
  casse,
  suggerimenti,
}: {
  tariffa: RigaTariffa;
  stagioni: Stagione[];
  casse: CassaScelta[];
  suggerimenti: string[];
}) {
  return (
    <>
      <BottoneModale
        etichetta="Modifica"
        icona="modifica"
        titolo={tariffa.nome}
        className="btn-ghost btn-sm"
      >
        <FormAzione azione={salvaTariffa}>
          <input type="hidden" name="id" value={tariffa.id} />
          <CampiTariffa
            stagioni={stagioni}
            casse={casse}
            tariffa={tariffa}
            suggerimenti={suggerimenti}
          />
          <Invia icona="salva">Salva</Invia>
        </FormAzione>
      </BottoneModale>

      <AzioneBottone
        azione={eliminaTariffa}
        valori={{ id: tariffa.id }}
        icona="elimina"
        conferma="Eliminare questa tariffa?"
        className="btn-danger btn-sm"
      >
        Elimina
      </AzioneBottone>
    </>
  );
}

function CampiTariffa({
  stagioni,
  casse,
  tariffa,
  suggerimenti,
}: {
  stagioni: Stagione[];
  casse: CassaScelta[];
  tariffa?: RigaTariffa;
  /** Nomi gia' usati: il campo resta libero, ma propone quello che c'e' gia'. */
  suggerimenti: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Voce *" span>
        <input
          name="nome"
          required
          list="nomi-tariffa"
          defaultValue={tariffa?.nome ?? ''}
          className="input"
          placeholder="es. Reiscrizione, Cassa comune, Noleggio replica"
        />
        <datalist id="nomi-tariffa">
          {suggerimenti.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <p className="mt-1 text-[11px] text-muted">
          Il nome e&rsquo; libero: nella stessa stagione possono convivere pi&ugrave; voci. La
          tendina propone quelle gi&agrave; usate, per non chiamarle ogni anno in modo diverso.
        </p>
      </Campo>

      <Campo label="Importo (EUR) *">
        <input
          name="importo"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={tariffa ? String(tariffa.importo) : ''}
          className="input"
        />
      </Campo>

      <Campo label="Stagione">
        <select name="stagioneId" defaultValue={tariffa?.stagioneId ?? ''} className="input">
          <option value="">vale per tutte le stagioni</option>
          {stagioni.map((s) => (
            <option key={s.id} value={s.id}>
              solo {s.nome}
            </option>
          ))}
        </select>
      </Campo>

      {/* Di chi sono i soldi: senza scegliere niente, del club. Una voce di
          un'altra cassa — l'istruttore del corso di Mario — spuntata su
          un'attività diventa la quota di quella cassa, e non si somma a
          quella del club. */}
      {(casse.length > 0 || tariffa?.cassaId) && (
        <Campo label="Cassa" span>
          <select name="cassaId" defaultValue={tariffa?.cassaId ?? ''} className="input">
            <option value="">cassa del club</option>
            {casse
              .filter((c) => c.attiva || c.id === tariffa?.cassaId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.attiva ? '' : ' (spenta)'}
                </option>
              ))}
          </select>
          <p className="mt-1 text-[11px] text-muted">
            Vale sulle attività: la voce diventa la quota di quella cassa e si paga a chi la tiene.
            Iscrizioni, rinnovi e tessere restano del club.
          </p>
        </Campo>
      )}

      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="perGiorno"
          defaultChecked={tariffa?.perGiorno ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span>
          Al giorno
          <span className="block text-[11px] text-muted">
            Su un&rsquo;attivit&agrave; di pi&ugrave; giorni si conta una volta per ogni giorno: una
            24 ore da sabato a domenica la chiede due volte. &Egrave; per le voci che valgono un
            giorno solo, come la giornaliera. Spenta, vale una volta sola.
          </span>
        </span>
      </label>

      {/* Quale quota paga la polizza lo dice la voce: la giornata sì,
          l'istruttore no. Chi viene da fuori si assicura quando ha pagato la
          quota che la contiene. */}
      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="perPolizza"
          defaultChecked={tariffa?.perPolizza ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span>
          Paga la polizza giornaliera
          <span className="block text-[11px] text-muted">
            Chi viene da fuori si assicura quando ha pagato (o segnalato) la quota che contiene
            questa voce: la polizza la paga il club e non torna indietro. Di solito è la giocata
            degli esterni; l&rsquo;istruttore di un corso, no.
          </span>
        </span>
      </label>

      <Campo label="Usala in automatico per" span>
        <div className="space-y-1.5">
          {VOCI.map((v) => (
            <label key={v} className="flex min-w-0 items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="usi"
                value={v}
                defaultChecked={tariffa?.usi.includes(v) ?? false}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
              />
              <span className="min-w-0">
                {ETICHETTA_VOCE[v]}
                <span className="block text-[11px] text-muted">{SPIEGA_VOCE[v]}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Facoltativo, e se ne possono spuntare pi&ugrave; d&rsquo;uno: la stessa voce pu&ograve;
          valere sia per l&rsquo;iscrizione sia per il rinnovo. Quando pi&ugrave; voci dichiarano lo
          stesso automatismo vengono proposte insieme, come spaccato della quota.
        </p>
      </Campo>

      <Campo label="Note" span>
        <input name="note" defaultValue={tariffa?.note ?? ''} className="input" />
      </Campo>
    </div>
  );
}
