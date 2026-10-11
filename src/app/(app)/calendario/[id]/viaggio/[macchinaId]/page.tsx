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
  cambiaModo,
  impostaAndataRitorno,
  impostaVisibilita,
  rispondiRichiesta,
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
import { ChipsTappa } from '@/components/ChipsTappa';
import { GiornoOra } from '@/components/GiornoOra';
import { giornoDi } from '@/lib/giorni';
import {
  ALIMENTAZIONI,
  TARIFFA_AUTOSTRADA,
  aggiornaKm,
  aggiornaPrezzo,
  consumoTipico,
  etichettaAlimentazione,
  unitaConsumo,
  unitaPrezzo,
  type Alimentazione,
} from '@/lib/percorso';

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
  const richieste = m.passeggeri.filter((p) => p.stato === 'RICHIESTO');
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
  /** Chi sale a una tappa, come chips; chi guida aggiunge e toglie (solo nei ritrovi). */
  const chipsDi = (tid: string) => (
    <ChipsTappa
      macchinaId={m.id}
      tappaId={tid}
      qui={chiInTappa(tid).map((p) => ({ id: p.userId, nome: nomeDi(p.user) }))}
      altri={saliti
        .filter((p) => p.tappaId !== tid)
        .map((p) => ({ id: p.userId, nome: nomeDi(p.user) }))}
      modifica={guida && m.modo === 'RITROVO'}
    />
  );

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
  const mieiDati =
    (ruolo === 'invitato' || (ruolo === 'passeggero' && m.modo === 'PRENDO')) && !miaTappa
      ? await prisma.user.findUnique({
          where: { id: me.id },
          select: { indirizzo: true, cap: true, citta: true, consensoIndirizzoIl: true },
        })
      : null;
  const casa = mieiDati ? casaDi(mieiDati) : '';
  // il consenso dato una volta vale finché non lo si toglie dal profilo
  const giaConsenso = !!mieiDati?.consensoIndirizzoIl;

  // i chilometri dal percorso, ricalcolati quando l'itinerario cambia; quelli
  // scritti a mano, se ci sono, vincono
  const percorso = await aggiornaKm(m);
  // andata e ritorno (il solito) conta doppio: chilometri, carburante, caselli
  const volte = m.andataRitorno ? 2 : 1;
  const kmAndata = m.km ?? percorso.km;
  const kmUsati = kmAndata != null ? kmAndata * volte : null;
  const kmAutostrada = percorso.autostrada != null ? percorso.autostrada * volte : null;
  const giornoViaggio = giornoDi(m.event.oraRitrovo ?? m.event.inizio);

  // Il carburante: alimentazione e consumo dell'autista (ricordati dalla volta
  // prima, o una macchina media), e il prezzo trovato fuori se non è scritto.
  const alimentazione = (ALIMENTAZIONI as readonly string[]).includes(m.alimentazione ?? '')
    ? (m.alimentazione as Alimentazione)
    : 'BENZINA';
  const consumoUsato = m.consumo ?? consumoTipico[alimentazione];
  const prezzoTrovato = await aggiornaPrezzo({ ...m, alimentazione });
  const prezzoUsato = m.prezzoLitro != null ? Number(m.prezzoLitro) : prezzoTrovato.prezzo;
  // i caselli: lo scontrino se c'è, se no la stima dall'autostrada del percorso
  const caselliStimati =
    kmAutostrada != null ? Math.round(kmAutostrada * TARIFFA_AUTOSTRADA * 100) / 100 : null;
  const caselliUsati = m.caselli != null ? Number(m.caselli) : caselliStimati;

  const conti = contiViaggio({
    autistaId: m.autistaId,
    persone: [m.autistaId, ...saliti.map((p) => p.userId)],
    km: kmUsati,
    consumo: consumoUsato,
    prezzoLitro: prezzoUsato,
    caselli: caselliUsati,
    spese: m.spese.map((s) => ({ userId: s.userId, tipo: s.tipo, importo: Number(s.importo) })),
  });
  const carburante = costoCarburante(kmUsati, consumoUsato, prezzoUsato);

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
                  <FormMacchina valori={m} arrivoDa={arrivo.cosa} giorno={giornoViaggio} />
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
                  {m.modo === 'PRENDO' && <DoveTiPrendo casa={casa} consenso={giaConsenso} />}
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

        {ruolo === 'richiesto' && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface2 p-3 text-sm">
            <span className="flex-1">
              Hai chiesto un passaggio a <strong>{nomeDi(m.autista)}</strong>: aspetta che ti
              risponda.
            </span>
            <AzioneBottone
              azione={rispondiPassaggio}
              valori={{ id: m.id, accetta: '0' }}
              icona="annulla"
              className="btn-ghost btn-sm"
            >
              Ritira
            </AzioneBottone>
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
              <DoveTiPrendo casa={casa} consenso={giaConsenso} />
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
            {s.chiave === 'bordo' && richieste.length + invitati.length > 0 && guida && (
              <span className="num ml-1.5 text-xs text-warn">
                {richieste.length + invitati.length}
              </span>
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

            {/* Il modo si sceglie qui, dove si vedono le tappe e chi ci sale. */}
            {guida ? (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted">Come carichi:</span>
                <div className="inline-flex rounded-lg border border-line p-0.5">
                  {(['RITROVO', 'PRENDO'] as const).map((modo) =>
                    modo === m.modo ? (
                      <span
                        key={modo}
                        className="rounded-md bg-nvg/15 px-3 py-1 text-xs font-medium text-nvg"
                      >
                        {etichettaModo[modo]}
                      </span>
                    ) : (
                      <AzioneBottone
                        key={modo}
                        azione={cambiaModo}
                        valori={{ id: m.id, modo }}
                        conferma={
                          m.tappe.length > 0
                            ? `Passare a «${etichettaModo[modo]}»? Le tappe di adesso si tolgono.`
                            : undefined
                        }
                        className="rounded-md px-3 py-1 text-xs text-muted hover:text-ink"
                      >
                        {etichettaModo[modo]}
                      </AzioneBottone>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <p className="mb-4 text-xs text-muted">{etichettaModo[m.modo]}</p>
            )}

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
                            chips={chipsDi(t.id)}
                            ritrovo={m.modo === 'RITROVO'}
                            modifica={
                              <ModificaTappa
                                macchinaId={m.id}
                                tappa={t}
                                ritrovo={m.modo === 'RITROVO'}
                                giorno={giornoViaggio}
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
                        chips={chipsDi(t.id)}
                        ritrovo={m.modo === 'RITROVO'}
                        modifica={
                          guida ? (
                            <ModificaTappa
                              macchinaId={m.id}
                              tappa={t}
                              ritrovo={m.modo === 'RITROVO'}
                              giorno={giornoViaggio}
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
              <div className="mt-4 rounded-lg border border-warn/40 bg-warn/5 p-3">
                <p className="text-xs text-warn">
                  Senza ritrovo{guida ? ': aggiungili a un ritrovo col «+ aggiungi»' : ''}
                </p>
                <ChipsTappa
                  macchinaId={m.id}
                  tappaId=""
                  qui={daAssegnare.map((p) => ({ id: p.userId, nome: nomeDi(p.user) }))}
                  altri={[]}
                  modifica={false}
                />
              </div>
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
                  etichetta="Indirizzo"
                  segnaposto="Scrivi l'indirizzo o incolla il link di Maps"
                  aiuto="Incollando il link di Maps il nome del posto si scrive da solo."
                  nomePosto={{ nome: 'nome', segnaposto: 'es. Bar Puccini' }}
                />
                <Campo label="A che ora">
                  <GiornoOra name="ora" giorno={giornoViaggio} />
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="titolo-sezione">A bordo</p>
              {/* privata è il solito: la vede solo chi è invitato */}
              <div className="inline-flex rounded-lg border border-line p-0.5">
                {(
                  [
                    [false, 'Privata'],
                    [true, 'Visibile a chi viene'],
                  ] as const
                ).map(([v, testo]) =>
                  v === m.pubblica ? (
                    <span
                      key={testo}
                      className="rounded-md bg-nvg/15 px-3 py-1 text-xs font-medium text-nvg"
                    >
                      {testo}
                    </span>
                  ) : guida ? (
                    <AzioneBottone
                      key={testo}
                      azione={impostaVisibilita}
                      valori={{ id: m.id, pubblica: v ? '1' : '0' }}
                      className="rounded-md px-3 py-1 text-xs text-muted hover:text-ink"
                    >
                      {testo}
                    </AzioneBottone>
                  ) : null,
                )}
              </div>
            </div>
            <p className="mb-3 text-xs text-muted">
              {m.pubblica
                ? 'La vede chi viene all’attività, e può chiederti un posto.'
                : 'La vedono solo gli invitati e chi è a bordo.'}
            </p>
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

            {guida && richieste.length > 0 && (
              <>
                <p className="label mt-4 text-warn">Chiedono un passaggio</p>
                <ul className="divide-y divide-line">
                  {richieste.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                      <span className="flex-1">{nomeCompleto(p.user)}</span>
                      <AzioneBottone
                        azione={rispondiRichiesta}
                        valori={{ id: m.id, userId: p.userId, accetta: '1' }}
                        icona="approva"
                        className="btn-primary btn-sm"
                      >
                        Lo porto
                      </AzioneBottone>
                      <AzioneBottone
                        azione={rispondiRichiesta}
                        valori={{ id: m.id, userId: p.userId, accetta: '0' }}
                        icona="rifiuta"
                        className="btn-ghost btn-sm"
                      >
                        No
                      </AzioneBottone>
                    </li>
                  ))}
                </ul>
              </>
            )}

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
            <p className="mb-4 text-xs text-muted">
              Si calcola da solo: i chilometri dal percorso, il prezzo dai distributori, i caselli
              dall’autostrada che fate. Il carburante conta per i chilometri, non per quanto si
              mette nel serbatoio.
            </p>

            {/* andata e ritorno è il solito, e si vede già scelto */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Il viaggio:</span>
              <div className="inline-flex rounded-lg border border-line p-0.5">
                {(
                  [
                    [true, 'Andata e ritorno'],
                    [false, 'Solo andata'],
                  ] as const
                ).map(([v, testo]) =>
                  v === m.andataRitorno ? (
                    <span
                      key={testo}
                      className="rounded-md bg-nvg/15 px-3 py-1 text-xs font-medium text-nvg"
                    >
                      {testo}
                    </span>
                  ) : guida ? (
                    <AzioneBottone
                      key={testo}
                      azione={impostaAndataRitorno}
                      valori={{ id: m.id, andataRitorno: v ? '1' : '0' }}
                      className="rounded-md px-3 py-1 text-xs text-muted hover:text-ink"
                    >
                      {testo}
                    </AzioneBottone>
                  ) : (
                    <span key={testo} className="px-3 py-1 text-xs text-muted">
                      {testo}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* i tre numeri che fanno il conto, ognuno con da dove viene */}
            <ul className="mb-4 space-y-2 text-sm">
              <li className="flex flex-wrap justify-between gap-2">
                <span>
                  Chilometri{m.andataRitorno ? ', andata e ritorno' : ', solo andata'}
                  <span className="block text-xs text-muted">
                    {m.km != null
                      ? 'scritti a mano'
                      : percorso.km != null
                        ? percorso.stimati
                          ? 'stima in linea d’aria: il servizio dei percorsi non ha risposto'
                          : 'dal percorso, si aggiornano quando cambi le tappe'
                        : m.partenza && m.arrivo
                          ? 'non trovo i punti sulla mappa: usa «Cerca» sugli indirizzi, o scrivili tu'
                          : 'servono partenza e arrivo'}
                  </span>
                </span>
                <strong className="num">
                  {kmUsati != null
                    ? m.andataRitorno
                      ? `${kmAndata} × 2 = ${kmUsati} km`
                      : `${kmUsati} km`
                    : '—'}
                </strong>
              </li>
              <li className="flex flex-wrap justify-between gap-2">
                <span>
                  {etichettaAlimentazione[alimentazione]}, {String(consumoUsato).replace('.', ',')}{' '}
                  {unitaConsumo(alimentazione)}/100 km
                  <span className="block text-xs text-muted">
                    {m.prezzoLitro != null
                      ? 'prezzo scritto a mano'
                      : (prezzoTrovato.fonte ?? 'prezzo non trovato: scrivilo tu')}
                    {m.consumo == null && ' · consumo di una macchina media'}
                  </span>
                </span>
                <strong className="num">
                  {prezzoUsato != null
                    ? `${prezzoUsato.toFixed(3).replace('.', ',')} ${unitaPrezzo(alimentazione)}`
                    : '—'}
                </strong>
              </li>
              <li className="flex flex-wrap justify-between gap-2">
                <span>
                  Caselli
                  <span className="block text-xs text-muted">
                    {m.caselli != null
                      ? 'scritti a mano'
                      : caselliStimati != null
                        ? kmAutostrada
                          ? `stima: ${kmAutostrada} km di autostrada a pagamento × ${TARIFFA_AUTOSTRADA.toFixed(2).replace('.', ',')} €/km`
                          : 'niente autostrada a pagamento sul percorso'
                        : 'dalle spese segnate'}
                  </span>
                </span>
                <strong className="num">
                  {caselliUsati != null ? fmtEuro(caselliUsati) : '—'}
                </strong>
              </li>
              {carburante != null && (
                <li className="flex justify-between gap-2 border-t border-line pt-2">
                  <span>
                    {alimentazione === 'ELETTRICA'
                      ? 'Ricarica del viaggio'
                      : 'Carburante del viaggio'}
                  </span>
                  <strong className="num">{fmtEuro(carburante)}</strong>
                </li>
              )}
            </ul>

            {guida && (
              <BottoneModale
                etichetta="La macchina e le correzioni"
                icona="modifica"
                titolo="Carburante e costi"
                className="btn-ghost btn-sm"
              >
                <FormAzione azione={salvaCostiViaggio}>
                  <input type="hidden" name="id" value={m.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo label="Alimentazione">
                      <select name="alimentazione" defaultValue={alimentazione} className="input">
                        {ALIMENTAZIONI.map((a) => (
                          <option key={a} value={a}>
                            {etichettaAlimentazione[a]}
                          </option>
                        ))}
                      </select>
                    </Campo>
                    <Campo label={`Consumo (${unitaConsumo(alimentazione)}/100 km)`}>
                      <input
                        type="text"
                        inputMode="decimal"
                        name="consumo"
                        defaultValue={m.consumo ?? ''}
                        className="input"
                        placeholder={`es. ${String(consumoTipico[alimentazione]).replace('.', ',')}`}
                      />
                    </Campo>
                  </div>
                  <p className="text-xs text-muted">
                    Alimentazione e consumo si ricordano per le tue prossime macchinate.
                  </p>
                  <p className="label mt-2">Correzioni (vuote: si calcolano da sole)</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Campo label="Km di sola andata">
                      <input
                        type="number"
                        name="km"
                        min={0}
                        defaultValue={m.km ?? ''}
                        className="input"
                        placeholder={percorso.km != null ? String(percorso.km) : ''}
                      />
                    </Campo>
                    <Campo label={`Prezzo (${unitaPrezzo(alimentazione)})`}>
                      <input
                        type="text"
                        inputMode="decimal"
                        name="prezzoLitro"
                        defaultValue={m.prezzoLitro != null ? Number(m.prezzoLitro) : ''}
                        className="input"
                        placeholder={
                          prezzoTrovato.prezzo != null
                            ? prezzoTrovato.prezzo.toFixed(3).replace('.', ',')
                            : ''
                        }
                      />
                    </Campo>
                    <Campo label="Caselli in tutto (€)">
                      <input
                        type="text"
                        inputMode="decimal"
                        name="caselli"
                        defaultValue={m.caselli != null ? Number(m.caselli) : ''}
                        className="input"
                        placeholder={
                          caselliStimati != null ? String(caselliStimati).replace('.', ',') : ''
                        }
                      />
                    </Campo>
                  </div>
                  <Invia icona="salva">Salva</Invia>
                </FormAzione>
              </BottoneModale>
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
                        <option value="CARBURANTE">Carburante o ricarica</option>
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
                Ancora niente da dividere: servono partenza e arrivo per i chilometri, o una spesa
                segnata.
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
  nome: string | null;
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
  chips,
  ritrovo,
  modifica,
}: {
  numero: number;
  tappa: Tappa;
  /** Può leggere l'indirizzo: se è la casa di un altro passeggero, no. */
  vede: boolean;
  chi: string[];
  /** Chi sale qui, come chips. */
  chips?: React.ReactNode;
  ritrovo: boolean;
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
          {ritrovo ? 'Ritrovo' : chi.length > 0 ? `Casa di ${chi.join(', ')}` : 'Tappa'}
        </span>
        {/* il nome del posto, se c'è, e sotto l'indirizzo */}
        <span className="break-words">{vede ? (tappa.nome ?? tappa.luogo) : 'Casa sua'}</span>
        {tappa.ora && <span className="num ml-2 text-nvg">{fmtTime(tappa.ora)}</span>}
        {vede && tappa.nome && tappa.nome !== tappa.luogo && (
          <span className="block break-words text-xs text-muted">{tappa.luogo}</span>
        )}
        {ritrovo && chips}
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
  giorno,
  saliti,
}: {
  macchinaId: string;
  tappa: Tappa;
  ritrovo: boolean;
  giorno: string;
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
          etichetta={ritrovo ? 'Indirizzo' : 'Dove'}
          valore={tappa.luogo}
          lat={tappa.lat}
          lng={tappa.lng}
          nomePosto={
            ritrovo
              ? { nome: 'nome', valore: tappa.nome, segnaposto: 'es. Bar Puccini' }
              : undefined
          }
        />
        <Campo label="A che ora">
          <GiornoOra name="ora" valore={inputDateTime(tappa.ora)} giorno={giorno} />
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
function DoveTiPrendo({ casa, consenso }: { casa: string; consenso: boolean }) {
  return (
    <>
      <CercaLuogo
        nome="dove"
        etichetta="Dove passa a prenderti"
        valore={casa || null}
        segnaposto="es. sotto casa, o il bar all'angolo"
        aiuto="Dal profilo arriva casa tua: puoi scrivere un altro posto."
      />
      {consenso ? (
        <p className="text-xs text-muted">
          Hai già detto che chi ti porta può sapere dove passare a prenderti: lo vede solo l’autista
          di questo viaggio. Lo togli dal profilo, in «Privacy e consensi».
        </p>
      ) : (
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" name="consenso" required className="mt-0.5 h-4 w-4 accent-nvg" />
          <span>
            Chi mi dà un passaggio può sapere dove passare a prendermi: solo l’autista di quel
            viaggio, e solo per quello. Vale anche per le prossime volte; lo tolgo quando voglio dal
            profilo.
          </span>
        </label>
      )}
    </>
  );
}
