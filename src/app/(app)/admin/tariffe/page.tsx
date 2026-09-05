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

type RigaTariffa = {
  id: string;
  nome: string;
  usi: VoceTariffa[];
  importo: unknown;
  stagioneId: string | null;
  note: string | null;
};

export default async function TariffePage() {
  await requirePermesso(isAdmin);

  const [stagioni, tariffe] = await Promise.all([
    prisma.stagione.findMany({ orderBy: { inizio: 'desc' }, select: { id: true, nome: true } }),
    prisma.tariffa.findMany({
      orderBy: [{ stagioneId: 'asc' }, { nome: 'asc' }],
      include: { stagione: { select: { nome: true } } },
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
                <CampiTariffa stagioni={stagioni} suggerimenti={suggerimenti} />
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
            <CampiTariffa stagioni={stagioni} suggerimenti={suggerimenti} />
            <Invia icona="salva">Aggiungi</Invia>
          </FormAzione>
        </BottoneModale>
      </div>

      <p className="mb-3 rounded-md border border-line bg-surface2 px-4 py-3 text-xs text-muted">
        Una tariffa <strong className="text-ink">senza stagione</strong> vale sempre: &egrave; il
        prezzo di listino. Aggiungendone una <strong className="text-ink">con la stagione</strong>{' '}
        quella vince, ma solo per quell&rsquo;anno &mdash; cos&igrave; si alza la quota di una
        stagione senza toccare il resto.
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
                  {t.usi.length > 0 && (
                    <p className="mt-1 text-[11px] text-nvg">
                      auto: {t.usi.map((u) => ETICHETTA_VOCE[u]).join(', ')}
                    </p>
                  )}
                  {t.note && <p className="mt-1 text-xs text-muted">{t.note}</p>}
                </div>
                <span className="num shrink-0 font-semibold text-nvg">
                  {fmtEuro(Number(t.importo))}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                <AzioniTariffa tariffa={t} stagioni={stagioni} suggerimenti={suggerimenti} />
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
                    </td>
                    <td className="num whitespace-nowrap text-right font-semibold text-nvg">
                      {fmtEuro(Number(t.importo))}
                    </td>
                    <td className="text-xs text-muted">{t.note ?? '-'}</td>
                    <td className="whitespace-nowrap">
                      <div className="flex gap-2">
                        <AzioniTariffa tariffa={t} stagioni={stagioni} suggerimenti={suggerimenti} />
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
  suggerimenti,
}: {
  tariffa: RigaTariffa;
  stagioni: Stagione[];
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
          <CampiTariffa stagioni={stagioni} tariffa={tariffa} suggerimenti={suggerimenti} />
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
  tariffa,
  suggerimenti,
}: {
  stagioni: Stagione[];
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
