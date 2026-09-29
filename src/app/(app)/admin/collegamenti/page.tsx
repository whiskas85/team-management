import Link from 'next/link';
import QRCode from 'qrcode';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { identita, profiloDi } from '@/lib/federazione';
import { Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { Icona } from '@/components/Icona';
import { CopiaTesto } from '@/components/CopiaTesto';
import { ScegliSquadraCollegata } from '@/components/ScegliSquadraCollegata';
import { DettagliProfilo, StemmaSquadra } from '@/components/ProfiloCollegato';
import {
  accettaRichiesta,
  creaLinkCollegamento,
  revocaLinkCollegamento,
  rifiutaRichiesta,
  riprovaInvio,
  scollegaSquadra,
} from '@/actions/collegamenti';

export const dynamic = 'force-dynamic';

/**
 * I gestionali delle altre squadre (docs/COLLEGAMENTO-SQUADRE.md).
 *
 * Da qui si condivide il nostro profilo (un link, o il suo QR), si incolla il
 * link di un'altra squadra, si decide sulle richieste arrivate e si tolgono i
 * collegamenti che non servono più.
 */
export default async function CollegamentiPage({
  searchParams,
}: {
  searchParams: Promise<{ inviata?: string }>;
}) {
  await requirePermesso(isAdmin);
  const { inviata } = await searchParams;
  const io = await identita();
  const adesso = new Date();

  const [link, collegamenti, squadre] = await Promise.all([
    prisma.linkCollegamento.findMany({
      // quelli chiesti da una squadra collegata per conto di un'altra non si
      // danno a mano: servono solo alla richiesta che arriva con loro
      where: { revocatoIl: null, scadeIl: { gt: adesso }, perConto: null },
      orderBy: { creatoIl: 'desc' },
    }),
    prisma.collegamentoSquadra.findMany({
      orderBy: { aggiornatoIl: 'desc' },
      include: {
        squadra: { select: { id: true, nome: true, logoPath: true } },
        messaggi: { orderBy: { creatoIl: 'asc' }, take: 1 },
      },
    }),
    prisma.squadraEsterna.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, collegamento: { select: { stato: true } } },
    }),
  ]);
  const qr = await Promise.all(
    link.map((l) =>
      QRCode.toString(`${io.indirizzo}/collega/${l.token}`, { type: 'svg', margin: 1 }),
    ),
  );
  const perScelta = squadre.map((s) => ({
    id: s.id,
    nome: s.nome,
    collegata: s.collegamento?.stato === 'ATTIVO',
  }));

  const richieste = collegamenti.filter((c) => c.stato === 'DA_ACCETTARE');
  const attivi = collegamenti.filter((c) => c.stato === 'ATTIVO');
  const inAttesa = collegamenti.filter((c) => c.stato === 'RICHIESTO');
  const chiusi = collegamenti.filter((c) => c.stato === 'RIFIUTATO' || c.stato === 'SCOLLEGATO');

  const logoDi = (c: (typeof collegamenti)[number]) =>
    c.squadra?.logoPath ? `/api/squadre/${c.squadra.id}/logo?v=${c.logoVersione ?? ''}` : null;

  return (
    <>
      <Intestazione
        titolo="Collegamenti"
        sottotitolo="I gestionali delle altre squadre collegati al nostro"
        descrizione="Due squadre collegate si invitano agli eventi, e i numeri dei presenti passano da soli. Passano solo il profilo della squadra e i referenti col callsign: nomi, adesioni e quote restano qui."
      />

      {inviata && (
        <p className="mb-6 rounded-md border border-nvg/40 bg-nvg/10 px-4 py-3 text-sm text-nvg">
          Richiesta mandata. Quando l’altra squadra la accetta, qui la trovi fra le collegate.
        </p>
      )}

      {richieste.length > 0 && (
        <section className="mb-6">
          <p className="titolo-sezione mb-3">Richieste di collegamento</p>
          <div className="space-y-3">
            {richieste.map((c) => {
              const p = profiloDi(c);
              return (
                <div key={c.id} className="card">
                  <div className="mb-3 flex items-center gap-3">
                    <StemmaSquadra
                      nome={p.nome}
                      logo={`${c.indirizzo}/api/federazione/logo`}
                      size={44}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold">{p.nome}</p>
                      <p className="break-all text-xs text-muted">
                        {c.indirizzo} · chiesto {fmtDateTime(c.richiestoIl)}
                      </p>
                    </div>
                  </div>
                  {c.nota && (
                    <p className="mb-3 rounded-md border border-nvg/40 bg-nvg/5 px-3 py-2 text-xs">
                      {c.nota}
                    </p>
                  )}
                  <DettagliProfilo profilo={p} />
                  <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
                    <FormAzione azione={accettaRichiesta} className="min-w-0 flex-1 space-y-3">
                      <input type="hidden" name="id" value={c.id} />
                      <ScegliSquadraCollegata squadre={perScelta} nome={p.nome} />
                      <Invia icona="approva">Accetta il collegamento</Invia>
                    </FormAzione>
                    <FormAzione azione={rifiutaRichiesta} className="contents">
                      <input type="hidden" name="id" value={c.id} />
                      <Invia icona="rifiuta" className="btn-ghost">
                        Rifiuta
                      </Invia>
                    </FormAzione>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="titolo-sezione">Condividi il nostro profilo</p>
              <p className="mt-1 text-xs text-muted">
                Un link, o il suo QR: chi lo apre dal suo gestionale ci manda la richiesta. Vale 7
                giorni e può servire a più squadre.
              </p>
            </div>
            <FormAzione azione={creaLinkCollegamento} className="contents">
              <Invia icona="aggiungi" className="btn-primary btn-sm">
                Nuovo link
              </Invia>
            </FormAzione>
          </div>
          {link.length === 0 ? (
            <p className="text-sm text-muted">Nessun link attivo.</p>
          ) : (
            <ul className="space-y-4">
              {link.map((l, i) => {
                const url = `${io.indirizzo}/collega/${l.token}`;
                return (
                  <li key={l.id} className="flex flex-wrap gap-4 rounded-md border border-line p-3">
                    <div
                      className="h-32 w-32 shrink-0 rounded bg-white p-1 [&_svg]:h-full [&_svg]:w-full"
                      // il QR lo disegna la libreria, da un testo nostro
                      dangerouslySetInnerHTML={{ __html: qr[i] }}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="break-all text-xs">{url}</p>
                      <p className="text-xs text-muted">
                        Scade il {fmtDate(l.scadeIl)} ·{' '}
                        {l.usato === 0
                          ? 'nessuna richiesta'
                          : l.usato === 1
                            ? 'una richiesta'
                            : `${l.usato} richieste`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <CopiaTesto testo={url} etichetta="Copia il link" />
                        <FormAzione azione={revocaLinkCollegamento} className="contents">
                          <input type="hidden" name="id" value={l.id} />
                          <Invia icona="annulla" className="btn-ghost btn-sm">
                            Revoca
                          </Invia>
                        </FormAzione>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <p className="titolo-sezione">Collega una squadra</p>
          <p className="mb-3 mt-1 text-xs text-muted">
            Hai ricevuto il link di un’altra squadra? Incollalo qui: nel passo dopo scegli a quale
            squadra dell’anagrafica corrisponde.
          </p>
          <form action="/admin/collegamenti/nuovo" method="get" className="space-y-3">
            <input
              name="link"
              required
              placeholder="https://ops.altrasquadra.it/collega/…"
              className="input"
              aria-label="Link di collegamento"
            />
            <button type="submit" className="btn-primary">
              <Icona nome="collegamento" size={15} /> Continua
            </button>
          </form>
          <p className="mt-4 text-xs text-muted">
            Il nostro indirizzo per gli altri gestionali:{' '}
            <span className="break-all">{io.indirizzo}</span>
          </p>
        </div>
      </div>

      <section className="mb-6">
        <p className="titolo-sezione mb-3">Squadre collegate</p>
        {attivi.length === 0 ? (
          <Vuoto testo="Nessuna squadra collegata, per ora." />
        ) : (
          <div className="space-y-3">
            {attivi.map((c) => {
              const p = profiloDi(c);
              const inCoda = c.messaggi[0];
              return (
                <div key={c.id} className="card">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <StemmaSquadra nome={p.nome} logo={logoDi(c)} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {c.squadra ? (
                          <Link href={`/admin/squadre/${c.squadra.id}`} className="hover:text-nvg">
                            {c.squadra.nome}
                          </Link>
                        ) : (
                          p.nome
                        )}
                      </p>
                      <p className="break-all text-xs text-muted">
                        {c.indirizzo} · collegata dal {fmtDate(c.attivoDal)}
                      </p>
                    </div>
                    <FormAzione azione={scollegaSquadra} className="contents">
                      <input type="hidden" name="id" value={c.id} />
                      <Invia icona="annulla" className="btn-ghost btn-sm">
                        Scollega
                      </Invia>
                    </FormAzione>
                  </div>
                  <DettagliProfilo profilo={p} />
                  {inCoda && inCoda.tentativi > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-warn">
                      <span className="min-w-0 flex-1">
                        Da mandare: {inCoda.tipo}, non arriva da {inCoda.tentativi}{' '}
                        {inCoda.tentativi === 1 ? 'tentativo' : 'tentativi'} ({inCoda.ultimoErrore}
                        ). Si riprova da solo.
                      </span>
                      <FormAzione azione={riprovaInvio} className="contents">
                        <input type="hidden" name="id" value={c.id} />
                        <Invia icona="riapri" className="btn-ghost btn-sm">
                          Riprova adesso
                        </Invia>
                      </FormAzione>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {inAttesa.length > 0 && (
        <section className="mb-6">
          <p className="titolo-sezione mb-3">In attesa di risposta</p>
          <div className="space-y-2">
            {inAttesa.map((c) => {
              const p = profiloDi(c);
              return (
                <div key={c.id} className="card flex flex-wrap items-center gap-3">
                  <StemmaSquadra nome={p.nome} logo={logoDi(c)} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{c.squadra?.nome ?? p.nome}</p>
                    <p className="text-xs text-muted">
                      Richiesta mandata il {fmtDateTime(c.richiestoIl)}
                    </p>
                  </div>
                  <FormAzione azione={scollegaSquadra} className="contents">
                    <input type="hidden" name="id" value={c.id} />
                    <Invia icona="annulla" className="btn-ghost btn-sm">
                      Ritira
                    </Invia>
                  </FormAzione>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {chiusi.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Chiusi ({chiusi.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            {chiusi.map((c) => (
              <li key={c.id}>
                {c.squadra?.nome ?? profiloDi(c).nome} ·{' '}
                {c.stato === 'RIFIUTATO' ? 'rifiutato' : 'scollegato'}{' '}
                {c.chiusoIl ? `il ${fmtDate(c.chiusoIl)}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
