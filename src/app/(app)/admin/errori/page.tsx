import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { fmtDateTime, nomeCompleto } from '@/lib/format';
import { Badge, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { AzioneBottone } from '@/components/AzioneBottone';
import { eliminaErrore, pulisciErroriVisti, segnaErroreVisto } from '@/actions/errori';

export const dynamic = 'force-dynamic';

/**
 * Il registro dei guasti visti dai browser della squadra.
 *
 * Prima di questa pagina, di un errore lato client restava questo: qualcuno
 * diceva «stamattina mi dava errore» e nessuno sapeva più cosa fosse. Adesso
 * ogni schianto arriva qui da solo, con l'ora, la pagina, il browser, la
 * versione del gestionale e — quello che conta di più — **il diario di bordo**:
 * le ultime cose successe prima, con l'orario accanto. È lì che si legge cosa
 * stava facendo.
 *
 * Le righe si segnano come guardate invece di cancellarle una a una: un
 * difetto che ritorna si riconosce solo se le vecchie sono ancora lì.
 */
export default async function ErroriPage() {
  await requirePermesso(isAdmin);

  const errori = await prisma.erroreClient.findMany({
    orderBy: { quando: 'desc' },
    take: 100,
    include: { utente: { select: { nome: true, cognome: true, callsign: true } } },
  });

  const daGuardare = errori.filter((e) => !e.visto).length;
  const ultimaSettimana = errori.filter(
    (e) => e.quando.getTime() > Date.now() - 7 * 86400000,
  ).length;
  // lo stesso messaggio che tocca più persone è un difetto vero, non la
  // giornata storta di qualcuno: è il numero da guardare per primo
  const ricorrenti = new Map<string, number>();
  for (const e of errori) ricorrenti.set(e.messaggio, (ricorrenti.get(e.messaggio) ?? 0) + 1);
  const piuVisto = [...ricorrenti.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <Intestazione
        titolo="Guasti"
        sottotitolo="Quello che si è rotto nei browser della squadra, con cosa si stava facendo"
        azioni={
          errori.some((e) => e.visto) ? (
            <AzioneBottone
              azione={pulisciErroriVisti}
              valori={{}}
              icona="elimina"
              conferma="Eliminare tutte le righe già guardate? Quelle non ancora viste restano."
              className="btn-ghost"
            >
              Pulisci i guardati
            </AzioneBottone>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica
          etichetta="Da guardare"
          valore={daGuardare}
          tono={daGuardare > 0 ? 'warn' : 'ok'}
        />
        <Statistica etichetta="Ultimi 7 giorni" valore={ultimaSettimana} />
        <Statistica etichetta="In registro" valore={errori.length} dettaglio="ultimi 100" />
        <Statistica
          etichetta="Il più frequente"
          valore={piuVisto ? `${piuVisto[1]}×` : '—'}
          dettaglio={piuVisto ? piuVisto[0].slice(0, 40) : undefined}
          tono={piuVisto && piuVisto[1] > 2 ? 'warn' : 'neutro'}
        />
      </div>

      {errori.length === 0 ? (
        <Vuoto testo="Nessun guasto registrato. Va bene così: qui ci finiscono da soli, nessuno deve ricordarsi di segnalarli." />
      ) : (
        <div className="space-y-3">
          {errori.map((e) => (
            <div
              key={e.id}
              className={`card ${e.visto ? 'opacity-60' : 'border-warn/40'}`}
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="flex flex-wrap items-center gap-2">
                  <code className="num text-[11px] text-nvg">{e.id.slice(-6)}</code>
                  <span className="font-medium">{e.messaggio}</span>
                  {e.nome && <Badge tono="neutro">{e.nome}</Badge>}
                  {!e.visto && <Badge tono="warn">da guardare</Badge>}
                </span>
                <span className="num text-[11px] text-muted">{fmtDateTime(e.quando)}</span>
              </div>

              <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                <span>{e.utente ? nomeCompleto(e.utente) : 'non riconosciuto'}</span>
                {e.indirizzo && <span className="num">{e.indirizzo}</span>}
                {e.versione && <span>v{e.versione}</span>}
                {e.origine && <span>{e.origine}</span>}
                {e.digest && <span className="num">digest {e.digest}</span>}
              </div>

              {/* Il diario prima della pila di chiamate, ed è voluto: dice cosa
                  stava facendo, che è la domanda a cui si vuole rispondere.
                  Lo stack serve dopo, quando si è capito quale caso riprodurre. */}
              {e.diario && (
                <details className="mb-2" open={!e.visto}>
                  <summary className="cursor-pointer text-xs text-nvg">
                    Cosa stava facendo
                  </summary>
                  <pre className="num mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-line bg-surface2 p-3 text-[11px] leading-relaxed text-muted">
                    {e.diario}
                  </pre>
                </details>
              )}

              {e.stack && (
                <details className="mb-2">
                  <summary className="cursor-pointer text-xs text-muted">Pila di chiamate</summary>
                  <pre className="num mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-line bg-surface2 p-3 text-[11px] text-muted">
                    {e.stack}
                  </pre>
                </details>
              )}

              {e.agente && (
                <details className="mb-2">
                  <summary className="cursor-pointer text-xs text-muted">Browser</summary>
                  <p className="mt-2 break-all text-[11px] text-muted">{e.agente}</p>
                </details>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <AzioneBottone
                  azione={segnaErroreVisto}
                  valori={{ id: e.id, verso: e.visto ? 'no' : 'si' }}
                  className="btn-ghost btn-sm"
                >
                  {e.visto ? 'Rimetti fra i da guardare' : 'Segna guardato'}
                </AzioneBottone>
                <AzioneBottone
                  azione={eliminaErrore}
                  valori={{ id: e.id }}
                  conferma="Eliminare questa riga?"
                  className="ml-auto text-[11px] text-muted transition-colors hover:text-danger"
                >
                  elimina
                </AzioneBottone>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Le righe arrivano da sole quando una pagina si rompe, e chi le incontra vede un{' '}
        <strong className="text-ink">riferimento</strong> di sei cifre: è lo stesso codice che si
        legge qui in testa a ogni riga, così «mi dava errore stamattina» diventa una riga sola da
        cercare. Gli aggiornamenti del gestionale non ci finiscono: quelli non sono guasti.
      </p>
    </>
  );
}
