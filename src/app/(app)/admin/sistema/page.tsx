import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import {
  controlli,
  daAlleggerire,
  disco,
  eDerivato,
  elencoAllegati,
  pesoDatabase,
  registraMisura,
  type Stato,
} from '@/lib/sistema';
import { Badge, Intestazione, Statistica } from '@/components/ui';
import { Barre, BarreOrizzontali, Linea } from '@/components/Grafico';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { Icona } from '@/components/Icona';
import { alleggerisciFile, misuraAdesso } from '@/actions/sistema';

export const dynamic = 'force-dynamic';

/** Un peso detto come si legge: 840 KB, 31,4 MB, 2,1 GB. */
function peso(b: number) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = b;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString('it-IT', { maximumFractionDigits: v < 10 && i > 1 ? 1 : 0 })} ${u[i]}`;
}
const mega = (b: number) => Math.round((b / 1024 / 1024) * 10) / 10;

const STATO: Record<
  Stato,
  { tono: 'ok' | 'warn' | 'danger'; parola: string; icona: '✓' | '!' | '✕' }
> = {
  ok: { tono: 'ok', parola: 'ok', icona: '✓' },
  attenzione: { tono: 'warn', parola: 'attenzione', icona: '!' },
  guasto: { tono: 'danger', parola: 'guasto', icona: '✕' },
};

/**
 * Lo stato del sistema: come sta il gestionale e quanto disco usa.
 *
 * In cima i numeri che contano e i controlli di salute; poi da dove viene il
 * peso — cartelle, anni, tabelle — e come cresce; in fondo gli strumenti per
 * tenerlo basso: l'alleggerimento dei file e l'archivio degli anni passati.
 */
export default async function SistemaPage() {
  await requirePermesso(isAdmin);

  const [d, file, db, stato] = await Promise.all([
    disco(),
    elencoAllegati(),
    pesoDatabase(),
    prisma.statoSistema.findUnique({ where: { id: 'unico' } }),
  ]);
  const veri = file.filter((f) => !eDerivato(f));
  const allegati = file.reduce((t, f) => t + f.byte, 0);
  // la misura di oggi si aggiorna aprendo la pagina: lo storico non aspetta i lavori
  await registraMisura({ disco: d, allegati, database: db.totale }).catch(() => null);
  const [salute, misure, inAttesa] = await Promise.all([
    controlli(d),
    prisma.misuraSpazio.findMany({ orderBy: { giorno: 'desc' }, take: 90 }),
    daAlleggerire(file),
  ]);

  const usatoPct = d ? (d.usato / d.totale) * 100 : 0;
  const tonoDisco = !d ? 'neutro' : usatoPct < 80 ? 'ok' : usatoPct < 90 ? 'warn' : 'danger';
  const guasti = salute.filter((c) => c.stato !== 'ok').length;

  const perCartella = Object.entries(
    veri.reduce<Record<string, number>>(
      (t, f) => ((t[f.cartella] = (t[f.cartella] ?? 0) + f.byte), t),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);
  const anni = [...new Set(veri.map((f) => f.anno))].sort();
  const perAnno = anni.map((a) => {
    const suoi = veri.filter((f) => f.anno === a);
    return {
      anno: a,
      byte: suoi.reduce((t, f) => t + f.byte, 0),
      file: suoi.length,
      pdf: suoi.filter((f) => f.relativo.toLowerCase().endsWith('.pdf')).length,
      daFare: inAttesa.filter((f) => f.anno === a).length,
    };
  });
  const annoCorrente = new Date().getFullYear();
  const storico = [...misure].reverse();
  const giorno = (g: string) => `${g.slice(8, 10)}/${g.slice(5, 7)}`;

  return (
    <>
      <Intestazione
        titolo="Stato del sistema"
        sottotitolo="Come sta il gestionale, e quanto disco usa"
        azioni={
          <FormAzione azione={misuraAdesso} className="contents">
            <Invia icona="riapri" className="btn-ghost btn-sm">
              Misura adesso
            </Invia>
          </FormAzione>
        }
      />

      {/* ------------------------------------------------ i numeri che contano */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica
          etichetta="Disco usato"
          valore={d ? `${Math.round(usatoPct)}%` : '—'}
          tono={tonoDisco}
          dettaglio={
            d ? `${peso(d.usato)} di ${peso(d.totale)} · liberi ${peso(d.libero)}` : 'non leggibile'
          }
        />
        <Statistica
          etichetta="Allegati"
          valore={peso(allegati)}
          dettaglio={`${veri.length} file`}
        />
        <Statistica
          etichetta="Database"
          valore={peso(db.totale)}
          dettaglio="dati, storico, impostazioni"
        />
        <Statistica
          etichetta="Risparmiato"
          valore={peso(Number(stato?.byteRisparmiati ?? 0))}
          tono={stato?.byteRisparmiati ? 'ok' : 'neutro'}
          dettaglio={`alleggerendo ${stato?.fileAlleggeriti ?? 0} file`}
        />
      </div>

      {/* ------------------------------------------------ salute */}
      <div className="card mb-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="titolo-sezione">Controlli</p>
          <Badge tono={guasti === 0 ? 'ok' : 'warn'}>
            {guasti === 0 ? '✓ tutto in ordine' : `! ${guasti} da guardare`}
          </Badge>
        </div>
        <ul className="divide-y divide-line">
          {salute.map((c) => (
            <li key={c.nome} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
              <span className="font-medium sm:w-40 sm:shrink-0">{c.nome}</span>
              <Badge tono={STATO[c.stato].tono}>
                {STATO[c.stato].icona} {STATO[c.stato].parola}
              </Badge>
              <span className="w-full text-xs text-muted sm:w-auto sm:min-w-0 sm:flex-1">
                {c.dice}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ------------------------------------------------ grafici */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="titolo-sezione mb-3">Come è occupato il disco</p>
          {d ? (
            <BarreOrizzontali
              dati={[
                { etichetta: 'Libero', valore: d.libero },
                {
                  etichetta: 'Sistema e altre app',
                  valore: Math.max(0, d.usato - allegati - db.totale),
                },
                { etichetta: 'Allegati', valore: allegati },
                { etichetta: 'Database', valore: db.totale },
              ].map((p) => ({ ...p, testo: peso(p.valore) }))}
            />
          ) : (
            <p className="text-xs text-muted">Lo spazio non si riesce a leggere.</p>
          )}
          <p className="mt-3 text-[11px] text-muted">
            Il disco è quello del server, condiviso: «Sistema e altre app» è tutto quello che non è
            del gestionale (il sistema operativo, Docker, gli altri gestionali ospitati).
          </p>
        </div>

        <div className="card">
          <p className="titolo-sezione mb-3">Disco usato, ultimi 90 giorni</p>
          <Linea
            dati={storico.map((m) => ({
              etichetta: giorno(m.giorno),
              valore: Number(m.discoTotale - m.discoLibero) / 1024 ** 3,
            }))}
            formatta={(v) => `${v.toLocaleString('it-IT', { maximumFractionDigits: 1 })} GB`}
          />
        </div>

        <div className="card">
          <p className="titolo-sezione mb-3">Gestionale (allegati + database), ultimi 90 giorni</p>
          <Linea
            dati={storico.map((m) => ({
              etichetta: giorno(m.giorno),
              valore: Number(m.allegati + m.database) / 1024 ** 2,
            }))}
            formatta={(v) => `${v.toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB`}
          />
        </div>

        <div className="card">
          <p className="titolo-sezione mb-3">Allegati per anno</p>
          {perAnno.length ? (
            <Barre
              unita=" MB"
              dati={perAnno.map((a) => ({ etichetta: String(a.anno), valore: mega(a.byte) }))}
            />
          ) : (
            <p className="text-xs text-muted">Nessun allegato.</p>
          )}
        </div>

        <div className="card">
          <p className="titolo-sezione mb-3">Allegati per tipo</p>
          <BarreOrizzontali
            dati={perCartella
              .slice(0, 8)
              .map(([c, b]) => ({ etichetta: c, valore: b, testo: peso(b) }))}
          />
        </div>

        <div className="card">
          <p className="titolo-sezione mb-3">Database: le tabelle più grandi</p>
          <BarreOrizzontali
            dati={db.tabelle.slice(0, 8).map((t) => ({
              etichetta: t.nome,
              valore: t.byte,
              testo: peso(t.byte),
            }))}
          />
        </div>
      </div>

      {/* ------------------------------------------------ alleggerimento */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="titolo-sezione">Alleggerimento dei file</p>
            <p className="mt-1 text-sm text-muted">
              PDF e foto si alleggeriscono da soli quando si caricano: i PDF con le immagini a 150
              dpi (si leggono e si stampano uguali), le foto a 2400 pixel sul lato lungo e senza i
              dati EXIF. Si tiene il risultato solo se è più piccolo davvero.
            </p>
            <p className="mt-2 text-sm">
              {inAttesa.length === 0 ? (
                <span className="text-nvg">✓ Tutti i file caricati sono già passati.</span>
              ) : (
                <>
                  <strong>{inAttesa.length}</strong> file caricati prima non sono ancora passati (
                  {peso(inAttesa.reduce((t, f) => t + f.byte, 0))}).
                </>
              )}
            </p>
          </div>
          {inAttesa.length > 0 && (
            <FormAzione azione={alleggerisciFile} className="contents">
              <Invia icona="scarica" attesa="Alleggerisco… (fino a 40 secondi)">
                Alleggerisci quelli già caricati
              </Invia>
            </FormAzione>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ archivio */}
      <div className="card">
        <p className="titolo-sezione">Archivio degli anni</p>
        <p className="mt-1 mb-3 text-sm text-muted">
          Per ogni anno gli allegati salvati quell’anno. «Scarica l’archivio» dà uno zip con tutti i
          file e l’indice, da tenere fuori dal server; «Alleggerisci» passa i file di quell’anno che
          non sono ancora passati. Lo zip comprime poco PDF e foto, che sono già compressi: lo
          spazio lo libera l’alleggerimento.
        </p>
        {perAnno.length === 0 ? (
          <p className="text-xs text-muted">Nessun allegato.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabella">
              <thead>
                <tr>
                  <th>Anno</th>
                  <th>File</th>
                  <th>PDF</th>
                  <th>Peso</th>
                  <th>Da alleggerire</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...perAnno].reverse().map((a) => (
                  <tr key={a.anno}>
                    <td className="num font-medium">
                      {a.anno}
                      {a.anno === annoCorrente && (
                        <span className="ml-1.5 text-[11px] text-muted">(in corso)</span>
                      )}
                    </td>
                    <td className="num">{a.file}</td>
                    <td className="num">{a.pdf}</td>
                    <td className="num">{peso(a.byte)}</td>
                    <td className="num">{a.daFare || '—'}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-2">
                        {a.daFare > 0 && (
                          <FormAzione azione={alleggerisciFile} className="contents">
                            <input type="hidden" name="anno" value={a.anno} />
                            <Invia className="btn-ghost btn-sm" attesa="Alleggerisco…">
                              Alleggerisci
                            </Invia>
                          </FormAzione>
                        )}
                        <a
                          href={`/api/sistema/archivio/${a.anno}`}
                          className="btn-ghost btn-sm"
                          download
                        >
                          <Icona nome="scarica" size={15} /> Scarica l’archivio
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
