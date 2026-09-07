import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stagioneAttiva } from '@/lib/stagioni';
import { puoAmministrare, tonoIscrizione } from '@/lib/domain';
import { fmtDate, fmtEuro, nomeCompleto, umanizza } from '@/lib/format';
import { Badge, Dato, Elenco, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { Conferma, FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { approvaIscrizione, cancellaIscrizione, rifiutaIscrizione } from '@/actions/iscrizioni';

export default async function RichiestePage() {
  await requirePermesso(puoAmministrare);

  const [daValutare, altre] = await Promise.all([
    prisma.membership.findMany({
      where: { status: 'COMPILATA' },
      orderBy: { compilataIl: 'asc' },
      include: {
        stagione: { select: { nome: true } },
        user: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            callsign: true,
            email: true,
            telefono: true,
            dataNascita: true,
            luogoNascita: true,
            codiceFiscale: true,
            indirizzo: true,
            citta: true,
            cap: true,
            provincia: true,
            emergenzaNome: true,
            emergenzaTel: true,
            gruppoSanguigno: true,
            allergie: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.membership.findMany({
      where: { status: { not: 'COMPILATA' } },
      orderBy: [{ stagione: { inizio: 'desc' } }, { invitataIl: 'desc' }],
      include: {
        user: { select: { id: true, nome: true, cognome: true, callsign: true } },
        stagione: { select: { nome: true } },
      },
    }),
  ]);

  const attive = altre.filter((i) => i.status === 'ATTIVA');

  // il nome della stagione lo decide chi l'ha aperta, non il calendario:
  // calcolarlo qui vorrebbe dire scrivere "2026/2027" dove la squadra legge "2026"
  const stagione = await stagioneAttiva();

  return (
    <>
      <Intestazione
        titolo="Richieste di iscrizione"
        sottotitolo={`Moduli compilati dagli operatori · stagione ${stagione.nome}`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica
          etichetta="Da valutare"
          valore={daValutare.length}
          tono={daValutare.length ? 'warn' : 'ok'}
        />
        <Statistica
          etichetta="Inviti non ancora compilati"
          valore={altre.filter((i) => i.status === 'INVITATA').length}
          tono="info"
        />
        <Statistica etichetta="Attive" valore={attive.length} tono="ok" />
        <Statistica
          etichetta="Quote deliberate"
          valore={fmtEuro(attive.reduce((t, i) => t + (i.quota ? Number(i.quota) : 0), 0))}
        />
      </div>

      {/* ------------------------------------------------ da valutare */}
      <h2 className="titolo-sezione mb-3">In attesa di accettazione</h2>
      {daValutare.length === 0 ? (
        <Vuoto testo="Nessun modulo da valutare." />
      ) : (
        <div className="space-y-3">
          {daValutare.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/operatori/${r.user.id}`}
                    className="font-medium hover:text-nvg"
                  >
                    {nomeCompleto(r.user)}
                  </Link>
                  <p className="text-xs text-muted">
                    {r.user.email}
                    {r.user.telefono ? ` · ${r.user.telefono}` : ''}
                  </p>
                  <p className="text-xs text-muted">
                    {umanizza(r.tipo)} · stagione {r.stagione.nome} · compilato il{' '}
                    {fmtDate(r.compilataIl)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge tono="warn">Da valutare</Badge>
                  {r.quota && <Badge tono="info">{fmtEuro(Number(r.quota))}</Badge>}
                </div>
              </div>

              {/* dati dichiarati nel modulo */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
                <Dato etichetta="Nato il" valore={fmtDate(r.user.dataNascita)} />
                <Dato etichetta="A" valore={r.user.luogoNascita ?? '—'} />
                <Dato etichetta="Codice fiscale" valore={r.user.codiceFiscale ?? '—'} />
                <Dato
                  etichetta="Residenza"
                  valore={
                    [r.user.indirizzo, r.user.cap, r.user.citta, r.user.provincia]
                      .filter(Boolean)
                      .join(', ') || '—'
                  }
                />
                <Dato
                  etichetta="Emergenza"
                  valore={
                    r.user.emergenzaNome
                      ? `${r.user.emergenzaNome} · ${r.user.emergenzaTel ?? ''}`
                      : '—'
                  }
                />
                <Dato etichetta="Gruppo sanguigno" valore={r.user.gruppoSanguigno ?? '—'} />
                <Dato etichetta="Allergie" valore={r.user.allergie ?? '—'} />
                <Dato etichetta="Contatto dal" valore={fmtDate(r.user.createdAt)} />
              </div>

              {r.compilato && (
                <p className="mt-3 whitespace-pre-wrap rounded-md border border-line bg-surface2 px-3 py-2 text-sm">
                  {r.compilato}
                </p>
              )}

              <div className="mt-4 grid gap-3 border-t border-line pt-4 md:grid-cols-2">
                <FormAzione azione={approvaIscrizione} className="space-y-2">
                  <input type="hidden" name="id" value={r.id} />
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="label">Quota (€)</label>
                      <input
                        name="quota"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={r.quota ? Number(r.quota) : ''}
                        className="input w-28"
                      />
                    </div>
                    <div>
                      <label className="label">Valida fino al</label>
                      <input type="date" name="scadeIl" className="input w-40" />
                    </div>
                    <Invia className="btn-primary btn-sm" icona="approva">
            Accetta in squadra
          </Invia>
                  </div>
                  <p className="text-xs text-muted">
                    Genera la quota da incassare e predispone la riga della tessera federale.
                  </p>
                </FormAzione>

                <div className="space-y-2">
                  <FormAzione azione={rifiutaIscrizione} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <div className="flex-1">
                      <label className="label">Motivo del rifiuto</label>
                      <input name="note" className="input" placeholder="Resta a storico" />
                    </div>
                    <Invia className="btn-danger btn-sm" icona="rifiuta">
            Rifiuta
          </Invia>
                  </FormAzione>

                  <FormAzione azione={cancellaIscrizione} className="">
                    <input type="hidden" name="id" value={r.id} />
                    <Conferma
                      messaggio="Cancellare la richiesta? Sparisce senza lasciare traccia di un rifiuto."
                      className="text-xs text-muted hover:text-danger"
                     icona="elimina">
            cancella per errore
          </Conferma>
                  </FormAzione>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------ storico */}
      <h2 className="titolo-sezione mb-3 mt-8">Tutte le iscrizioni</h2>
      {altre.length === 0 ? (
        <Vuoto testo="Nessuna iscrizione registrata." />
      ) : (
        <Elenco
          cards={altre.map((i) => (
            <div key={i.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{nomeCompleto(i.user)}</h3>
                  <p className="text-xs text-muted num">
                    {umanizza(i.tipo)} · {i.stagione.nome} · {fmtEuro(i.quota ? Number(i.quota) : null)}
                  </p>
                </div>
                <Badge tono={tonoIscrizione[i.status] ?? 'neutro'}>{umanizza(i.status)}</Badge>
              </div>
              <div className="mt-3 border-t border-line pt-3">
                <FormAzione azione={cancellaIscrizione} className="">
                  <input type="hidden" name="id" value={i.id} />
                  <Conferma
                    messaggio="Cancellare questa iscrizione?"
                    className="text-xs text-muted hover:text-danger"
                   icona="elimina">
            cancella
          </Conferma>
                </FormAzione>
              </div>
            </div>
          ))}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Operatore</th>
                  <th>Tipo</th>
                  <th>Stagione</th>
                  <th>Quota</th>
                  <th>Inviata</th>
                  <th>Decisa</th>
                  <th>Stato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {altre.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link
                        href={`/admin/operatori/${i.user.id}`}
                        className="font-medium hover:text-nvg"
                      >
                        {i.user.cognome} {i.user.nome}
                      </Link>
                    </td>
                    <td className="text-muted">{umanizza(i.tipo)}</td>
                    <td className="text-xs num">{i.stagione.nome}</td>
                    <td className="whitespace-nowrap num">
                      {fmtEuro(i.quota ? Number(i.quota) : null)}
                    </td>
                    <td className="whitespace-nowrap text-muted num">{fmtDate(i.invitataIl)}</td>
                    <td className="whitespace-nowrap text-muted num">{fmtDate(i.decisaIl)}</td>
                    <td>
                      <Badge tono={tonoIscrizione[i.status] ?? 'neutro'}>{umanizza(i.status)}</Badge>
                    </td>
                    <td className="text-right">
                      <FormAzione azione={cancellaIscrizione} className="">
                        <input type="hidden" name="id" value={i.id} />
                        <Conferma
                          messaggio="Cancellare questa iscrizione? Non resta traccia di un rifiuto."
                          className="text-xs text-muted hover:text-danger"
                         icona="elimina">
            cancella
          </Conferma>
                      </FormAzione>
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
