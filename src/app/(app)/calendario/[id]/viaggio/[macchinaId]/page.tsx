import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { fmtDateTime, fmtEuro, fmtTime, inputDateTime, nomeCompleto } from '@/lib/format';
import {
  arrivoSuggerito,
  caricaMacchina,
  casaDi,
  meta,
  nomeDi,
  propostePasseggeri,
  ruoloIn,
} from '@/lib/macchine';
import {
  contiViaggio,
  costoCarburante,
  etichettaModo,
  etichettaSpesa,
  linkViaggio,
} from '@/lib/viaggio';
import {
  aggiungiSpesaViaggio,
  aggiungiTappa,
  eliminaMacchina,
  eliminaSpesaViaggio,
  eliminaTappa,
  invitaPasseggeri,
  modificaTappa,
  rispondiPassaggio,
  riordinaTappe,
  salvaCostiViaggio,
  salvaMacchina,
  togliPasseggero,
} from '@/actions/macchine';
import { Badge, Campo, Intestazione } from '@/components/ui';
import { BottoneModale } from '@/components/Modale';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { AzioneBottone } from '@/components/AzioneBottone';
import { BottoneElimina } from '@/components/CardRiga';
import { CercaLuogo } from '@/components/CercaLuogo';
import { ElencoOrdinabile } from '@/components/ElencoOrdinabile';
import { FormMacchina } from '@/components/FormMacchina';
import { Icona } from '@/components/Icona';
import { linkNaviga } from '@/components/Naviga';
import { ScegliPersone } from '@/components/ScegliPersone';

const SCHEDE = [
  { chiave: 'itinerario', titolo: 'Itinerario' },
  { chiave: 'bordo', titolo: 'A bordo' },
  { chiave: 'costi', titolo: 'Costi' },
] as const;

/**
 * Il viaggio di una macchina: l'itinerario, chi c'è a bordo, e i conti.
 *
 * La vedono l'autista, chi è a bordo e chi è stato invitato (per rispondere);
 * l'admin per rimediare. Gli indirizzi seguono le regole di lib/macchine: la
 * partenza è dell'autista, la casa di un passeggero è sua e dell'autista.
 */
export default async function ViaggioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; macchinaId: string }>;
  searchParams: Promise<{ scheda?: string }>;
}) {
  const { id, macchinaId } = await params;
  const { scheda: chiesta } = await searchParams;
  const me = await requireUser();
  const m = await caricaMacchina(macchinaId);
  if (!m || m.eventId !== id) notFound();
  const ruolo = ruoloIn(m, me);
  if (!ruolo) notFound();

  const autista = ruolo === 'autista';
  const guida = autista || ruolo === 'admin';
  const scheda = SCHEDE.some((s) => s.chiave === chiesta) ? chiesta! : 'itinerario';
  const base = `/calendario/${id}/viaggio/${m.id}`;
  const aperta = m.event.status === 'RILASCIATA';

  const saliti = m.passeggeri.filter((p) => p.stato === 'ACCETTATO');
  const invitati = m.passeggeri.filter((p) => p.stato === 'INVITATO');
  const rifiutati = m.passeggeri.filter((p) => p.stato === 'RIFIUTATO');
  const io = m.passeggeri.find((p) => p.userId === me.id);
  const nomi = new Map([
    [m.autistaId, nomeDi(m.autista)],
    ...m.passeggeri.map((p) => [p.userId, nomeDi(p.user)] as const),
  ]);

  // Chi vede l'indirizzo di una tappa: un ritrovo tutti, la casa di qualcuno
  // solo lui e l'autista (e l'admin, che rimedia).
  const vedeTappa = (t: (typeof m.tappe)[number]) =>
    m.modo === 'RITROVO' || guida || saliti.some((p) => p.userId === me.id && p.tappaId === t.id);
  const chiInTappa = (tid: string) => saliti.filter((p) => p.tappaId === tid);
  const daAssegnare = saliti.filter((p) => !p.tappaId);

  const arrivoMeta = meta(m.arrivo, m.arrivoLat, m.arrivoLng);
  const partenzaMeta = meta(m.partenza, m.partenzaLat, m.partenzaLng);
  const tutto = linkViaggio(
    [
      partenzaMeta ?? '',
      ...m.tappe.map((t) => meta(t.luogo, t.lat, t.lng) ?? ''),
      arrivoMeta ?? '',
    ].filter(Boolean),
  );
  const miaTappa = io?.tappaId ? m.tappe.find((t) => t.id === io.tappaId) : null;
  const miaMeta = miaTappa ? meta(miaTappa.luogo, miaTappa.lat, miaTappa.lng) : null;

  // per rispondere nel modo «passo a prenderti»: casa dal profilo, come suggerimento
  const casa =
    (ruolo === 'invitato' || (ruolo === 'passeggero' && m.modo === 'PRENDO')) && !miaTappa
      ? await prisma.user
          .findUnique({ where: { id: me.id }, select: { indirizzo: true, cap: true, citta: true } })
          .then((u) => (u ? casaDi(u) : ''))
      : '';

  const conti = contiViaggio({
    autistaId: m.autistaId,
    persone: [m.autistaId, ...saliti.map((p) => p.userId)],
    km: m.km,
    consumo: m.consumo,
    prezzoLitro: m.prezzoLitro != null ? Number(m.prezzoLitro) : null,
    caselli: m.caselli != null ? Number(m.caselli) : null,
    spese: m.spese.map((s) => ({ userId: s.userId, tipo: s.tipo, importo: Number(s.importo) })),
  });
  const carburante = costoCarburante(
    m.km,
    m.consumo,
    m.prezzoLitro != null ? Number(m.prezzoLitro) : null,
  );

  const proposte =
    guida && scheda === 'bordo' && aperta ? await propostePasseggeri(id, m.autistaId, m.id) : [];
  const giaQui = new Set(m.passeggeri.filter((p) => p.stato !== 'RIFIUTATO').map((p) => p.userId));

  const arrivo = arrivoSuggerito(m.event);

  return (
    <>
      <Link
        href={`/calendario/${id}`}
        className="mb-4 inline-block text-xs text-muted hover:text-nvg"
      >
        ← {m.event.titolo}
      </Link>

      <Intestazione
        titolo="Il viaggio"
        sottotitolo={`${m.event.titolo} · ${fmtDateTime(m.event.inizio)}`}
        azioni={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tono="info">{etichettaModo[m.modo]}</Badge>
            {guida && (
              <BottoneModale
                etichetta="Modifica"
                icona="modifica"
                titolo="La macchina"
                className="btn-ghost btn-sm"
                larga
              >
                <FormAzione azione={salvaMacchina}>
                  <input type="hidden" name="id" value={m.id} />
                  <FormMacchina valori={m} arrivoDa={arrivo.cosa} />
                  {saliti.length > 0 && (
                    <p className="text-xs text-warn">
                      Cambiando modo le tappe ripartono da zero: nel modo «passo a prenderli» ogni
                      passeggero ti dirà di nuovo dove.
                    </p>
                  )}
                  <Invia icona="salva">Salva</Invia>
                </FormAzione>
                <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
                  <p className="text-xs text-muted">
                    Togli la macchina: chi era a bordo resta a piedi, e lo avvisiamo.
                  </p>
                  <BottoneElimina
                    azione={eliminaMacchina}
                    valori={{ id: m.id }}
                    conferma="Togliere la macchina? Chi era a bordo resta a piedi."
                    etichetta="Togli la macchina"
                  />
                </div>
              </BottoneModale>
            )}
          </div>
        }
      />

      {/* -------------------------------------------- chi guida, e la mia risposta */}
      <div className="card mb-6">
        <p className="text-sm">
          {autista ? (
            <>
              <strong>Guidi tu</strong>
            </>
          ) : (
            <>
              Guida <strong>{nomeCompleto(m.autista)}</strong>
              {m.autista.telefono && (
                <a
                  href={`tel:${m.autista.telefono}`}
                  className="ml-2 text-xs text-nvg hover:underline"
                >
                  {m.autista.telefono}
                </a>
              )}
            </>
          )}{' '}
          · {saliti.length} a bordo{m.posti != null && ` su ${m.posti} posti`}
        </p>
        {m.note && <p className="mt-1 text-sm text-muted">{m.note}</p>}

        {ruolo === 'invitato' && io && (
          <div className="mt-4 space-y-3 rounded-lg border border-warn/40 bg-warn/10 p-3">
            <p className="text-sm">
              <strong>{nomeDi(m.autista)}</strong> ti offre un posto.{' '}
              {m.modo === 'PRENDO'
                ? 'Passa a prenderti: digli dove.'
                : 'Ci si trova a un punto di ritrovo, che decide lui.'}
            </p>
            {aperta ? (
              <>
                <FormAzione azione={rispondiPassaggio}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="accetta" value="1" />
                  {m.modo === 'PRENDO' && <DoveTiPrendo casa={casa} />}
                  <Invia icona="approva">Salgo</Invia>
                </FormAzione>
                <AzioneBottone
                  azione={rispondiPassaggio}
                  valori={{ id: m.id, accetta: '0' }}
                  icona="rifiuta"
                  className="btn-ghost btn-sm"
                >
                  No, grazie
                </AzioneBottone>
              </>
            ) : (
              <p className="text-xs text-muted">L’attività non è più aperta.</p>
            )}
          </div>
        )}

        {ruolo === 'passeggero' && m.modo === 'PRENDO' && !miaTappa && (
          <div className="mt-4 space-y-3 rounded-lg border border-warn/40 bg-warn/10 p-3">
            <p className="text-sm">
              {nomeDi(m.autista)} passa a prenderti: <strong>digli dove</strong>.
            </p>
            <FormAzione azione={rispondiPassaggio}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="accetta" value="1" />
              <DoveTiPrendo casa={casa} />
              <Invia icona="salva">Conferma</Invia>
            </FormAzione>
          </div>
        )}
      </div>

      {/* -------------------------------------------- le schede */}
      <div
        role="tablist"
        className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-line px-1 [scrollbar-width:none]"
      >
        {SCHEDE.map((s) => (
          <Link
            key={s.chiave}
            href={s.chiave === 'itinerario' ? base : `${base}?scheda=${s.chiave}`}
            role="tab"
            aria-selected={s.chiave === scheda}
            scroll={false}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              s.chiave === scheda
                ? 'border-nvg font-medium text-nvg'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {s.titolo}
            {s.chiave === 'bordo' && invitati.length > 0 && guida && (
              <span className="num ml-1.5 text-xs text-warn">{invitati.length}</span>
            )}
            {s.chiave === 'costi' && conti.totale > 0 && (
              <span className="num ml-1.5 text-xs text-muted">{fmtEuro(conti.totale)}</span>
            )}
          </Link>
        ))}
      </div>

      {/* ============================================ itinerario */}
      {scheda === 'itinerario' && (
        <div className="space-y-4">
          <div className="card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="titolo-sezione">Itinerario</p>
              {guida && tutto && (
                <a href={tutto} target="_blank" rel="noreferrer" className="btn-primary btn-sm">
                  <Icona nome="naviga" size={14} /> Tutto il viaggio in Maps
                </a>
              )}
              {!guida && miaMeta && (
                <a
                  href={linkNaviga(miaMeta)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary btn-sm"
                >
                  <Icona nome="naviga" size={14} /> Naviga al tuo punto
                </a>
              )}
            </div>

            <ol className="space-y-3">
              {/* la partenza è casa dell'autista: la vede solo lui */}
              {guida && (
                <Punto
                  lettera="P"
                  etichetta="Partenza"
                  luogo={m.partenza ?? 'Da decidere'}
                  ora={m.partenzaOra}
                  naviga={partenzaMeta}
                  sotto="La vedi solo tu."
                />
              )}

              {m.tappe.length > 0 &&
                (guida && m.tappe.length > 1 ? (
                  <li>
                    <ElencoOrdinabile
                      azione={riordinaTappe}
                      valori={{ id: m.id }}
                      elementi={m.tappe.map((t, i) => ({
                        id: t.id,
                        contenuto: (
                          <RigaTappa
                            numero={i + 1}
                            tappa={t}
                            vede
                            chi={chiInTappa(t.id).map((p) => nomeDi(p.user))}
                            modifica={
                              <ModificaTappa
                                macchinaId={m.id}
                                tappa={t}
                                ritrovo={m.modo === 'RITROVO'}
                                saliti={saliti.map((p) => ({
                                  id: p.userId,
                                  nome: nomeCompleto(p.user),
                                  qui: p.tappaId === t.id,
                                }))}
                              />
                            }
                          />
                        ),
                      }))}
                    />
                  </li>
                ) : (
                  m.tappe.map((t, i) => (
                    <li key={t.id}>
                      <RigaTappa
                        numero={i + 1}
                        tappa={t}
                        vede={vedeTappa(t)}
                        chi={chiInTappa(t.id).map((p) => nomeDi(p.user))}
                        modifica={
                          guida ? (
                            <ModificaTappa
                              macchinaId={m.id}
                              tappa={t}
                              ritrovo={m.modo === 'RITROVO'}
                              saliti={saliti.map((p) => ({
                                id: p.userId,
                                nome: nomeCompleto(p.user),
                                qui: p.tappaId === t.id,
                              }))}
                            />
                          ) : undefined
                        }
                      />
                    </li>
                  ))
                ))}

              <Punto
                lettera="A"
                etichetta="Arrivo"
                luogo={m.arrivo ?? 'Da decidere'}
                ora={m.arrivoOra}
                naviga={arrivoMeta}
              />
            </ol>

            {m.tappe.length === 0 && (
              <p className="mt-3 text-sm text-muted">
                {m.modo === 'PRENDO'
                  ? 'Nessuna tappa ancora: ognuno, salendo, dice dove passare a prenderlo.'
                  : 'Nessun punto di ritrovo ancora.'}
              </p>
            )}
            {guida && m.tappe.length > 1 && (
              <p className="mt-3 text-[11px] text-muted">
                Trascina le tappe dalla maniglia per metterle nell’ordine in cui passi.
              </p>
            )}
            {m.modo === 'RITROVO' && daAssegnare.length > 0 && (
              <p className="mt-3 text-sm text-warn">
                Senza ritrovo: {daAssegnare.map((p) => nomeDi(p.user)).join(', ')}.
              </p>
            )}
            {m.modo === 'PRENDO' && guida && daAssegnare.length > 0 && (
              <p className="mt-3 text-sm text-warn">
                Non ti hanno ancora detto dove passare:{' '}
                {daAssegnare.map((p) => nomeDi(p.user)).join(', ')}.
              </p>
            )}
          </div>

          {guida && m.modo === 'RITROVO' && (
            <BottoneModale
              etichetta="Aggiungi un punto di ritrovo"
              icona="aggiungi"
              titolo="Nuovo punto di ritrovo"
              className="btn-ghost btn-sm"
            >
              <FormAzione azione={aggiungiTappa}>
                <input type="hidden" name="id" value={m.id} />
                <CercaLuogo
                  nome="luogo"
                  etichetta="Dove"
                  segnaposto="es. parcheggio del casello di Agrate"
                />
                <Campo label="A che ora">
                  <input type="datetime-local" name="ora" className="input" />
                </Campo>
                {saliti.length > 0 && (
                  <fieldset>
                    <legend className="label">Chi si trova qui</legend>
                    <Spunte
                      persone={saliti.map((p) => ({
                        id: p.userId,
                        nome: nomeCompleto(p.user),
                        // il primo ritrovo li prende tutti; i successivi chi è rimasto senza
                        scelto: !p.tappaId,
                      }))}
                    />
                  </fieldset>
                )}
                <Invia icona="salva">Aggiungi</Invia>
              </FormAzione>
            </BottoneModale>
          )}
        </div>
      )}

      {/* ============================================ a bordo */}
      {scheda === 'bordo' && (
        <div className="space-y-4">
          <div className="card">
            <p className="titolo-sezione mb-3">A bordo</p>
            <ul className="divide-y divide-line">
              <li className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="flex-1">
                  {nomeCompleto(m.autista)} <span className="text-xs text-muted">· guida</span>
                </span>
              </li>
              {saliti.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    {nomeCompleto(p.user)}
                    {guida && p.user.telefono && (
                      <a
                        href={`tel:${p.user.telefono}`}
                        className="ml-2 text-xs text-nvg hover:underline"
                      >
                        {p.user.telefono}
                      </a>
                    )}
                  </span>
                  {guida && (
                    <BottoneElimina
                      azione={togliPasseggero}
                      valori={{ id: m.id, userId: p.userId }}
                      conferma={`Far scendere ${nomeCompleto(p.user)}? Lo avvisiamo.`}
                      etichetta={`Fai scendere ${nomeCompleto(p.user)}`}
                      piccolo
                    />
                  )}
                </li>
              ))}
            </ul>
            {saliti.length === 0 && <p className="mt-2 text-sm text-muted">Ancora nessuno.</p>}

            {invitati.length > 0 && (
              <>
                <p className="label mt-4">In attesa di risposta</p>
                <ul className="divide-y divide-line">
                  {invitati.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 py-2 text-sm">
                      <span className="flex-1 text-muted">{nomeCompleto(p.user)}</span>
                      {guida && (
                        <BottoneElimina
                          azione={togliPasseggero}
                          valori={{ id: m.id, userId: p.userId }}
                          conferma={`Ritirare l'invito a ${nomeCompleto(p.user)}?`}
                          etichetta={`Ritira l'invito a ${nomeCompleto(p.user)}`}
                          piccolo
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {guida && rifiutati.length > 0 && (
              <p className="mt-3 text-xs text-muted">
                Hanno detto di no: {rifiutati.map((p) => nomeDi(p.user)).join(', ')}.
              </p>
            )}

            {ruolo === 'passeggero' && (
              <div className="mt-4 flex justify-end">
                <AzioneBottone
                  azione={rispondiPassaggio}
                  valori={{ id: m.id, accetta: '0' }}
                  conferma="Scendere dalla macchina? L'autista lo saprà."
                  icona="esci"
                  className="btn-ghost btn-sm"
                >
                  Scendo
                </AzioneBottone>
              </div>
            )}
          </div>

          {guida && aperta && (
            <BottoneModale
              etichetta="Invita"
              icona="invita"
              titolo="Chi porti?"
              className="btn-primary btn-sm"
            >
              <FormAzione azione={invitaPasseggeri}>
                <input type="hidden" name="id" value={m.id} />
                <p className="text-xs text-muted">
                  In cima chi porti più spesso, poi chi all’attività viene.
                  {m.posti != null && ` Posti liberi: ${Math.max(0, m.posti - saliti.length)}.`}
                </p>
                <ScegliPersone
                  persone={proposte
                    .filter((p) => !giaQui.has(p.id))
                    .map((p) => ({ id: p.id, nome: p.nome, sotto: p.sotto, spento: p.occupato }))}
                />
                <Invia icona="invita">Manda gli inviti</Invia>
              </FormAzione>
            </BottoneModale>
          )}
        </div>
      )}

      {/* ============================================ costi */}
      {scheda === 'costi' && (
        <div className="space-y-4">
          <div className="card">
            <p className="titolo-sezione mb-1">Quanto è costato</p>
            <p className="mb-3 text-xs text-muted">
              Il carburante si conta dai chilometri, non da quanto si è messo nel serbatoio: un
              pieno da 150 € su un viaggio che ne consuma 10 vale 10 €. Se nessuno dichiara niente,
              ha pagato tutto chi guida.
            </p>
            {guida ? (
              <FormAzione azione={salvaCostiViaggio}>
                <input type="hidden" name="id" value={m.id} />
                <div className="grid gap-3 sm:grid-cols-4">
                  <Campo label="Km (andata e ritorno)">
                    <input
                      type="number"
                      name="km"
                      min={0}
                      defaultValue={m.km ?? ''}
                      className="input"
                    />
                  </Campo>
                  <Campo label="Consumo (l/100 km)">
                    <input
                      type="text"
                      inputMode="decimal"
                      name="consumo"
                      defaultValue={m.consumo ?? ''}
                      className="input"
                      placeholder="es. 6,5"
                    />
                  </Campo>
                  <Campo label="Prezzo al litro (€)">
                    <input
                      type="text"
                      inputMode="decimal"
                      name="prezzoLitro"
                      defaultValue={m.prezzoLitro != null ? Number(m.prezzoLitro) : ''}
                      className="input"
                      placeholder="es. 1,85"
                    />
                  </Campo>
                  <Campo label="Caselli in tutto (€)">
                    <input
                      type="text"
                      inputMode="decimal"
                      name="caselli"
                      defaultValue={m.caselli != null ? Number(m.caselli) : ''}
                      className="input"
                      placeholder="vuoto: quelli segnati"
                    />
                  </Campo>
                </div>
                <Invia icona="salva">Salva</Invia>
              </FormAzione>
            ) : (
              <p className="text-sm">
                {m.km ? `${m.km} km` : 'Chilometri non scritti'}
                {m.consumo ? ` · ${m.consumo} l/100 km` : ''}
                {m.prezzoLitro != null ? ` · ${Number(m.prezzoLitro).toFixed(3)} €/l` : ''}
                {m.caselli != null ? ` · caselli ${fmtEuro(Number(m.caselli))}` : ''}
              </p>
            )}
            {carburante != null && (
              <p className="mt-2 text-sm">
                Carburante del viaggio: <strong className="num">{fmtEuro(carburante)}</strong>
              </p>
            )}
          </div>

          <div className="card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="titolo-sezione">Chi ha pagato cosa</p>
              {(ruolo === 'autista' || ruolo === 'passeggero' || ruolo === 'admin') && (
                <BottoneModale
                  etichetta="Ho pagato"
                  icona="aggiungi"
                  titolo="Una spesa del viaggio"
                  className="btn-ghost btn-sm"
                >
                  <FormAzione azione={aggiungiSpesaViaggio}>
                    <input type="hidden" name="id" value={m.id} />
                    {guida && (
                      <Campo label="Chi ha pagato">
                        <select name="userId" defaultValue={me.id} className="input">
                          {[m.autistaId, ...saliti.map((p) => p.userId)].map((u) => (
                            <option key={u} value={u}>
                              {nomi.get(u)}
                            </option>
                          ))}
                        </select>
                      </Campo>
                    )}
                    <Campo label="Cosa">
                      <select name="tipo" defaultValue="CARBURANTE" className="input">
                        <option value="CARBURANTE">Carburante</option>
                        <option value="CASELLO">Casello</option>
                        <option value="ALTRO">Altro (parcheggio, …)</option>
                      </select>
                    </Campo>
                    <Campo label="Quanto (€)">
                      <input
                        type="text"
                        inputMode="decimal"
                        name="importo"
                        required
                        className="input"
                        placeholder="es. 7,40"
                      />
                    </Campo>
                    <Campo label="Nota">
                      <input name="note" className="input" placeholder="es. casello di Brescia" />
                    </Campo>
                    <Invia icona="salva">Segna</Invia>
                  </FormAzione>
                </BottoneModale>
              )}
            </div>
            {m.spese.length === 0 ? (
              <p className="text-sm text-muted">
                Nessuno ha segnato niente: per ora ha pagato tutto {nomeDi(m.autista)}.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {m.spese.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      {nomeDi(s.user)} · {etichettaSpesa[s.tipo]}
                      {s.note && <span className="text-xs text-muted"> · {s.note}</span>}
                    </span>
                    <span className="num">{fmtEuro(Number(s.importo))}</span>
                    {(guida || s.userId === me.id) && (
                      <BottoneElimina
                        azione={eliminaSpesaViaggio}
                        valori={{ id: m.id, spesaId: s.id }}
                        conferma="Togliere questa spesa?"
                        etichetta="Togli la spesa"
                        piccolo
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <p className="titolo-sezione mb-3">Come si divide</p>
            {conti.totale === 0 ? (
              <p className="text-sm text-muted">
                Ancora niente da dividere: scrivi i chilometri, il consumo e il prezzo, o segna una
                spesa.
              </p>
            ) : (
              <>
                <ul className="mb-3 space-y-1 text-sm">
                  {conti.voci.map((v) => (
                    <li key={v.tipo} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {etichettaSpesa[v.tipo]}
                        <span className="text-xs text-muted">
                          {v.da === 'calcolato'
                            ? ' · dai chilometri'
                            : v.da === 'scritto'
                              ? ' · costo scritto'
                              : ' · dalle spese segnate'}
                          {v.dichiarato > v.costo &&
                            ` · segnati ${fmtEuro(v.dichiarato)}, contano ${fmtEuro(v.costo)}`}
                          {v.restoAutista > 0 &&
                            ` · ${fmtEuro(v.restoAutista)} li ha messi ${nomeDi(m.autista)}`}
                        </span>
                      </span>
                      <span className="num">{fmtEuro(v.costo)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-2 border-t border-line pt-1 font-medium">
                    <span>Totale, diviso per {conti.righe.length}</span>
                    <span className="num">{fmtEuro(conti.totale)}</span>
                  </li>
                </ul>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted">
                        <th className="py-1 font-normal">Chi</th>
                        <th className="py-1 text-right font-normal">Ha pagato</th>
                        <th className="py-1 text-right font-normal">Parte</th>
                        <th className="py-1 text-right font-normal">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conti.righe.map((r) => (
                        <tr key={r.userId} className="border-t border-line">
                          <td className="py-1.5">{nomi.get(r.userId)}</td>
                          <td className="num py-1.5 text-right">{fmtEuro(r.pagato)}</td>
                          <td className="num py-1.5 text-right">{fmtEuro(r.parte)}</td>
                          <td
                            className={`num py-1.5 text-right ${
                              r.saldo > 0 ? 'text-nvg' : r.saldo < 0 ? 'text-warn' : 'text-muted'
                            }`}
                          >
                            {r.saldo > 0 ? '+' : ''}
                            {fmtEuro(r.saldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="label mt-4">Chi deve a chi</p>
                {conti.passaggi.length === 0 ? (
                  <p className="text-sm text-muted">Siete pari.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {conti.passaggi.map((p, i) => (
                      <li
                        key={i}
                        className={`flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 ${
                          p.da === me.id || p.a === me.id ? 'bg-nvg/10' : ''
                        }`}
                      >
                        <strong>{nomi.get(p.da)}</strong>
                        <span className="text-muted">dà a</span>
                        <strong>{nomi.get(p.a)}</strong>
                        <span className="num ml-auto font-semibold">{fmtEuro(p.importo)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {conti.ignorate.length > 0 && (
                  <p className="mt-3 text-xs text-muted">
                    Non contano le spese di chi non è più a bordo (
                    {conti.ignorate.map((s) => nomi.get(s.userId) ?? '—').join(', ')}).
                  </p>
                )}
                <p className="mt-4 text-[11px] text-muted">
                  È solo un conto: i soldi non passano dal gestionale, e non li segue nessuno.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Partenza o arrivo: una lettera, il posto, l'ora, e il pulsante per andarci. */
function Punto({
  lettera,
  etichetta,
  luogo,
  ora,
  naviga,
  sotto,
}: {
  lettera: string;
  etichetta: string;
  luogo: string;
  ora: Date | null;
  naviga: string | null;
  sotto?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-nvg text-xs font-bold text-bg">
        {lettera}
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block text-[11px] uppercase tracking-wide text-muted">{etichetta}</span>
        <span className="break-words">{luogo}</span>
        {ora && <span className="num ml-2 text-nvg">{fmtTime(ora)}</span>}
        {sotto && <span className="block text-[11px] text-muted">{sotto}</span>}
      </span>
      {naviga && (
        <a
          href={linkNaviga(naviga)}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost btn-sm shrink-0"
        >
          <Icona nome="naviga" size={14} /> Naviga
        </a>
      )}
    </li>
  );
}

type Tappa = {
  id: string;
  luogo: string;
  lat: number | null;
  lng: number | null;
  ora: Date | null;
};

function RigaTappa({
  numero,
  tappa,
  vede,
  chi,
  modifica,
}: {
  numero: number;
  tappa: Tappa;
  /** Può leggere l'indirizzo: se è la casa di un altro passeggero, no. */
  vede: boolean;
  chi: string[];
  modifica?: React.ReactNode;
}) {
  const dove = meta(tappa.luogo, tappa.lat, tappa.lng);
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-nvg text-xs font-bold text-nvg">
        {numero}
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block text-[11px] uppercase tracking-wide text-muted">
          {chi.length > 0 ? chi.join(', ') : 'Tappa'}
        </span>
        <span className="break-words">{vede ? tappa.luogo : 'Casa sua'}</span>
        {tappa.ora && <span className="num ml-2 text-nvg">{fmtTime(tappa.ora)}</span>}
      </span>
      {vede && dove && (
        <a
          href={linkNaviga(dove)}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost btn-sm shrink-0"
        >
          <Icona nome="naviga" size={14} />
          <span className="sr-only">Naviga</span>
        </a>
      )}
      {modifica}
    </div>
  );
}

function ModificaTappa({
  macchinaId,
  tappa,
  ritrovo,
  saliti,
}: {
  macchinaId: string;
  tappa: Tappa;
  ritrovo: boolean;
  saliti: { id: string; nome: string; qui: boolean }[];
}) {
  return (
    <BottoneModale
      etichetta={ritrovo ? 'Modifica il ritrovo' : 'Modifica la tappa'}
      icona="modifica"
      titolo={ritrovo ? 'Punto di ritrovo' : 'Tappa'}
      className="btn-ghost btn-sm shrink-0"
      soloIcona
    >
      <FormAzione azione={modificaTappa}>
        <input type="hidden" name="id" value={macchinaId} />
        <input type="hidden" name="tappaId" value={tappa.id} />
        <CercaLuogo
          nome="luogo"
          etichetta="Dove"
          valore={tappa.luogo}
          lat={tappa.lat}
          lng={tappa.lng}
        />
        <Campo label="A che ora">
          <input
            type="datetime-local"
            name="ora"
            defaultValue={inputDateTime(tappa.ora)}
            className="input"
          />
        </Campo>
        {ritrovo && saliti.length > 0 && (
          <fieldset>
            <legend className="label">Chi si trova qui</legend>
            <Spunte persone={saliti.map((p) => ({ id: p.id, nome: p.nome, scelto: p.qui }))} />
          </fieldset>
        )}
        <Invia icona="salva">Salva</Invia>
      </FormAzione>
      {ritrovo && (
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs text-muted">Chi si trovava qui resta senza ritrovo.</p>
          <BottoneElimina
            azione={eliminaTappa}
            valori={{ id: macchinaId, tappaId: tappa.id }}
            conferma="Togliere questo punto di ritrovo?"
            etichetta="Togli il ritrovo"
          />
        </div>
      )}
    </BottoneModale>
  );
}

/** Caselle da spuntare, una per passeggero: poche, non serve la ricerca. */
function Spunte({ persone }: { persone: { id: string; nome: string; scelto: boolean }[] }) {
  return (
    <div className="space-y-1.5">
      {persone.map((p) => (
        <label key={p.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="userId"
            value={p.id}
            defaultChecked={p.scelto}
            className="h-4 w-4 accent-nvg"
          />
          {p.nome}
        </label>
      ))}
    </div>
  );
}

/**
 * Dove passare a prendermi: casa dal profilo come suggerimento, e la conferma
 * esplicita di farlo sapere all'autista — a lui solo, per questo viaggio.
 */
function DoveTiPrendo({ casa }: { casa: string }) {
  return (
    <>
      <CercaLuogo
        nome="dove"
        etichetta="Dove passa a prenderti"
        valore={casa || null}
        segnaposto="es. sotto casa, o il bar all'angolo"
        aiuto="Dal profilo arriva casa tua: puoi scrivere un altro posto."
      />
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" name="consenso" required className="mt-0.5 h-4 w-4 accent-nvg" />
        <span>
          Faccio sapere questo indirizzo all’autista, solo per questo viaggio. Gli altri passeggeri
          vedono solo il mio nome; si cancella da solo una settimana dopo l’attività.
        </span>
      </label>
    </>
  );
}
