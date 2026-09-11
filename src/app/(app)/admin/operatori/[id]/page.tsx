import Link from 'next/link';
import { headers } from 'next/headers';
import { SegnaLetto } from '@/components/SegnaLetto';
import { notFound, redirect } from 'next/navigation';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  etichettaRuolo,
  etichettaStato,
  isAdmin,
  isContatto,
  puoVedereNuovi,
  puoVedereOperatori,
  statoEffettivo,
  tonoCertificato,
  tonoFigt,
  tonoIscrizione,
  tonoPagamento,
  tonoRuolo,
  tonoStato,
  vedeAreaTesseramento,
} from '@/lib/domain';
import { fmtDate, fmtDateTime, fmtEuro, iniziali, inputDate, nomeCompleto, umanizza } from '@/lib/format';
import { Partecipazioni } from '@/components/Partecipazioni';
import { Avatar, Badge, Campo, Dato, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { Anello, Barre, mesiRecenti } from '@/components/Grafico';
import { Conferma, Fisarmonica, FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { SceltaRuoli, SceltaStato } from '@/components/FormOperatore';
import { AzioniContatto } from '@/components/AzioniContatto';
import {
  aggiornaAccesso,
  aggiornaProfilo,
  eliminaOperatore,
  resettaPassword,
} from '@/actions/operatori';
import { haIncarichi } from '@/lib/domain';
import { citabili } from '@/lib/note';
import { BloccoNote, type NotaLetta } from '@/components/Note';

export default async function SchedaOperatorePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermesso(puoVedereOperatori);
  const { id } = await params;
  const admin = isAdmin(me.roles);

  // l'indirizzo da cui si sta guardando è lo stesso che deve usare la squadra:
  // finisce nel messaggio delle credenziali, così non va dettato a memoria
  const intestazioni = await headers();
  const host = intestazioni.get('host');
  const indirizzo = host
    ? `${intestazioni.get('x-forwarded-proto') ?? 'http'}://${host}`
    : undefined;

  const utente = await prisma.user.findUnique({
    where: { id },
    include: {
      certificates: { orderBy: { createdAt: 'desc' } },
      memberships: { orderBy: { invitataIl: 'desc' }, include: { stagione: { select: { nome: true } } } },
      figtCards: { orderBy: { createdAt: 'desc' }, include: { stagione: { select: { nome: true } } } },
      // i pagamenti del club: quelli delle altre casse li vede chi le gestisce
      payments: { where: { cassaId: null }, orderBy: { createdAt: 'desc' } },
      rsvps: {
        include: {
          // l'id serve perché dalla riga si va sull'attività
          event: {
            select: { id: true, titolo: true, inizio: true, tipo: { select: { nome: true } } },
          },
        },
        orderBy: { respondedAt: 'desc' },
      },
    },
  });
  if (!utente) notFound();

  const tesserato = vedeAreaTesseramento(utente.stato);
  const contatto = isContatto(utente.stato);

  // la scheda di chi non è ancora in squadra la apre solo chi lo segue: al team
  // leader basta sapere che "Mario R." si è segnato, non chi sia
  if (contatto && !puoVedereNuovi(me.roles)) redirect('/dashboard?errore=permessi');

  // Le mie note su questa persona: quelle appuntate a lei e quelle scritte
  // altrove che la nominano con la chiocciola. Sono solo le mie — di quelle
  // degli altri qui non si vede nemmeno che esistono.
  const scrivoNote = haIncarichi(me.roles);
  const [mieNote, persone] = scrivoNote
    ? await Promise.all([
        prisma.nota.findMany({
          where: {
            autoreId: me.id,
            OR: [{ userId: utente.id }, { citate: { some: { userId: utente.id } } }],
          },
          orderBy: { createdAt: 'desc' },
          include: {
            persona: { select: { nome: true, cognome: true, callsign: true } },
            evento: { select: { titolo: true } },
            citate: {
              include: {
                utente: { select: { id: true, nome: true, cognome: true, callsign: true } },
              },
            },
          },
        }),
        citabili(),
      ])
    : [[], []];

  const svolti = utente.rsvps.filter((r) => new Date(r.event.inizio) < new Date());
  const presenzeConfermate = svolti.filter((r) => r.presente === true);
  const tassoPresenza = svolti.length ? (presenzeConfermate.length / svolti.length) * 100 : 0;
  const adesioni = utente.rsvps.filter((r) => r.status === 'PRESENTE');
  const daSaldare = utente.payments
    .filter((p) => p.status === 'DA_PAGARE' || p.status === 'PARZIALE')
    .reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0);
  const versato = utente.payments.reduce((t, p) => t + Number(p.pagato), 0);

  const certAttuale = utente.certificates[0];
  const statoCert = certAttuale ? statoEffettivo(certAttuale) : null;

  // ripartizione per tipologia, ricavata da ciò che l'operatore ha fatto
  const perTipo = [...new Set(adesioni.map((r) => r.event.tipo?.nome ?? 'Senza tipologia'))]
    .map((nome) => ({
      etichetta: nome,
      valore: adesioni.filter((r) => (r.event.tipo?.nome ?? 'Senza tipologia') === nome).length,
    }))
    .sort((a, b) => b.valore - a.valore)
    .slice(0, 6);

  return (
    <>
      {/* aprire la scheda vale come averla letta: toglie il pallino sui Nuovi */}
      <SegnaLetto profiloId={utente.id} />

      <Link
        href={contatto ? '/admin/nuovi' : '/admin/operatori'}
        className="mb-4 inline-block text-xs text-muted hover:text-nvg"
      >
        ← {contatto ? 'Nuovi' : 'Operatori'}
      </Link>

      <Intestazione titolo={nomeCompleto(utente)} sottotitolo={utente.email} />

      <div className="card mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar
          iniziali={iniziali(utente.nome, utente.cognome)}
          size="lg"
          fotoDi={utente.fotoPath ? utente.id : null}
        />
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge tono={tonoStato[utente.stato]}>{etichettaStato[utente.stato]}</Badge>
            {utente.roles.map((r) => (
              <Badge key={r} tono={tonoRuolo[r]}>
                {etichettaRuolo[r]}
              </Badge>
            ))}
            {tesserato &&
              (statoCert ? (
                <Badge tono={tonoCertificato[statoCert]}>Certificato {umanizza(statoCert)}</Badge>
              ) : (
                <Badge tono="danger">Nessun certificato</Badge>
              ))}
          </div>
          {utente.frase && (
            <p className="mt-2 border-l-2 border-nvg/40 pl-2 text-sm italic text-ink/80">
              {utente.frase}
            </p>
          )}
          {/* Vista l'ultima volta, non «entrata» l'ultima volta: chi ha
              spuntato «ricordami» non fa un accesso per due mesi pur usando il
              gestionale tutti i giorni, e da qui sembrava sparito. L'accesso
              resta scritto a fianco, perché «non è mai entrato» e «è entrato e
              poi non l'ha più aperto» sono due situazioni diverse. */}
          <p className="mt-2 text-xs text-muted num">
            In archivio dal {fmtDate(utente.createdAt)}
            {utente.ultimaAttivita
              ? ` · visto l’ultima volta il ${fmtDateTime(utente.ultimaAttivita)}`
              : ' · mai entrato'}
            {utente.ultimoAccesso && ` · ultimo accesso ${fmtDate(utente.ultimoAccesso)}`}
            {utente.disabledAt && ` · disabilitato il ${fmtDate(utente.disabledAt)}`}
          </p>
          {utente.cancellazioneChiesta && (
            <p className="mt-2 text-xs text-danger">
              Ha chiesto la cancellazione dei dati il {fmtDate(utente.cancellazioneChiesta)}.
            </p>
          )}
          <div className="mt-3">
            <AzioniContatto
              telefono={utente.telefono}
              email={utente.email}
              nome={utente.nome}
              compatto
            />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- numeri e grafici */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica etichetta="Adesioni" valore={adesioni.length} />
        <Statistica
          etichetta="Presenze confermate"
          valore={presenzeConfermate.length}
          dettaglio={`su ${svolti.length} eventi svolti`}
          tono="ok"
        />
        <Statistica
          etichetta="Da saldare"
          valore={fmtEuro(daSaldare)}
          tono={daSaldare > 0 ? 'warn' : 'ok'}
        />
        <Statistica etichetta="Totale versato" valore={fmtEuro(versato)} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <p className="titolo-sezione mb-4">Adesioni per mese</p>
          <Barre dati={mesiRecenti(utente.rsvps.map((r) => r.event.inizio))} />
        </div>
        <div className="card flex flex-col items-center justify-center gap-4">
          <Anello percentuale={tassoPresenza} etichetta="Affidabilità presenze" />
          <div className="w-full space-y-1.5">
            {perTipo.map((t) => (
              <div key={t.etichetta} className="flex justify-between text-xs">
                <span className="text-muted">{t.etichetta}</span>
                <span className="num">{t.valore}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- anagrafica */}
      <div className="card mb-6">
        <p className="titolo-sezione mb-4">Anagrafica</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Dato etichetta="Telefono" valore={utente.telefono ?? '—'} />
          <Dato etichetta="Data di nascita" valore={fmtDate(utente.dataNascita)} />
          <Dato etichetta="Luogo di nascita" valore={utente.luogoNascita ?? '—'} />
          <Dato etichetta="Codice fiscale" valore={utente.codiceFiscale ?? '—'} />
          <Dato
            etichetta="Residenza"
            valore={
              [utente.indirizzo, utente.cap, utente.citta, utente.provincia]
                .filter(Boolean)
                .join(', ') || '—'
            }
          />
          <Dato etichetta="Emergenza" valore={utente.emergenzaNome ?? '—'} />
          <Dato etichetta="Tel. emergenza" valore={utente.emergenzaTel ?? '—'} />
          <Dato etichetta="Gruppo sanguigno" valore={utente.gruppoSanguigno ?? '—'} />
          <Dato etichetta="Allergie" valore={utente.allergie ?? '—'} />
          <Dato
            etichetta="Consenso immagini"
            valore={utente.consensoImmagini ? 'Prestato' : 'Negato'}
          />
          <Dato etichetta="Privacy accettata" valore={fmtDate(utente.privacyAccettataIl)} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {tesserato && (
          <>
            <div className="card">
              <p className="titolo-sezione mb-3">Certificati medici</p>
              {utente.certificates.length === 0 ? (
                <p className="text-sm text-muted">Nessun certificato caricato.</p>
              ) : (
                <div className="space-y-2">
                  {utente.certificates.map((c) => {
                    const s = statoEffettivo(c);
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                        <div>
                          <a
                            href={`/api/certificati/${c.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-nvg"
                          >
                            {umanizza(c.tipo)}
                          </a>
                          <span className="block text-xs text-muted num">
                            scade {fmtDate(c.scadeIl)} · caricato {fmtDate(c.createdAt)}
                          </span>
                        </div>
                        <Badge tono={tonoCertificato[s]}>{umanizza(s)}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card">
              <p className="titolo-sezione mb-3">Iscrizioni e tessere</p>
              <div className="space-y-2">
                {utente.memberships.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span>
                      {umanizza(m.tipo)} {m.stagione.nome}
                      <span className="block text-xs text-muted num">
                        {fmtEuro(m.quota ? Number(m.quota) : null)}
                      </span>
                    </span>
                    <Badge tono={tonoIscrizione[m.status] ?? 'neutro'}>{umanizza(m.status)}</Badge>
                  </div>
                ))}
                {utente.figtCards.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span>
                      <span className="num">FIGT {t.codice ?? 's.n.'}</span>
                      <span className="block text-xs text-muted num">
                        {t.stagione.nome} · scade {fmtDate(t.scadeIl)}
                      </span>
                    </span>
                    <Badge tono={tonoFigt[t.status] ?? 'neutro'}>{umanizza(t.status)}</Badge>
                  </div>
                ))}
                {utente.memberships.length === 0 && utente.figtCards.length === 0 && (
                  <p className="text-sm text-muted">Nessuna iscrizione né tessera.</p>
                )}
              </div>
            </div>
          </>
        )}

        {contatto && utente.memberships.length > 0 && (
          <div className="card">
            <p className="titolo-sezione mb-3">Iter di iscrizione</p>
            <div className="space-y-2">
              {utente.memberships.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span>
                    {umanizza(m.tipo)} {m.stagione.nome}
                    <span className="block text-xs text-muted num">
                      inviata {fmtDate(m.invitataIl)}
                      {m.compilataIl && ` · compilata ${fmtDate(m.compilataIl)}`}
                    </span>
                  </span>
                  <Badge tono={tonoIscrizione[m.status] ?? 'neutro'}>{umanizza(m.status)}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <p className="titolo-sezione mb-3">Pagamenti</p>
          {utente.payments.length === 0 ? (
            <p className="text-sm text-muted">Nessun movimento.</p>
          ) : (
            <div className="space-y-2">
              {utente.payments.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{p.descrizione}</span>
                    <span className="text-xs text-muted num">
                      {umanizza(p.tipo)} · {fmtEuro(Number(p.importo))}
                    </span>
                  </span>
                  <Badge tono={tonoPagamento[p.status] ?? 'neutro'}>{umanizza(p.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Le note stanno qui ma non sono di questa scheda: sono di chi
            guarda. Due persone che aprono lo stesso operatore vedono cose
            diverse, ed è esattamente il punto. */}
        {scrivoNote && (
          <BloccoNote
            note={mieNote as NotaLetta[]}
            persone={persone}
            userId={utente.id}
            titolo={`Le tue note su ${utente.nome}`}
            contesto
          />
        )}
      </div>

      {/* -------------------------------------------------- gestione admin */}
      {admin && (
        <div className="mt-8">
          <Fisarmonica titolo="Ruoli, stato e accesso">
            <div className="grid gap-6 md:grid-cols-2">
              <FormAzione azione={aggiornaAccesso}>
                <input type="hidden" name="userId" value={utente.id} />
                <SceltaRuoli attuali={utente.roles} />
                <SceltaStato attuale={utente.stato} />
                <Invia className="btn-ghost btn-sm" icona="salva">
            Aggiorna
          </Invia>
              </FormAzione>

              <div className="space-y-6">
                <FormAzione azione={resettaPassword} indirizzo={indirizzo}>
                  <input type="hidden" name="userId" value={utente.id} />
                  <p className="mb-2 text-xs text-muted">
                    Genera una password nuova e la mostra qui una volta sola: non esce nessuna
                    email, quindi gliela consegni tu. Al primo accesso dovr&agrave; sceglierne una
                    sua prima di poter fare altro.
                  </p>
                  {utente.deveCambiarePassword && (
                    <p className="mb-2 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                      Ha una password provvisoria: deve ancora cambiarla.
                    </p>
                  )}
                  <Conferma
                    className="btn-ghost btn-sm"
                    icona="chiave"
                    messaggio={`Generare una nuova password per ${utente.nome} ${utente.cognome}? Quella attuale smetterà di funzionare subito.`}
                  >
                    Genera una nuova password
                  </Conferma>
                </FormAzione>

                <FormAzione azione={eliminaOperatore} className="border-t border-line pt-4">
                  <input type="hidden" name="userId" value={utente.id} />
                  <input
                    type="hidden"
                    name="ritorno"
                    value={contatto ? '/admin/nuovi' : '/admin/operatori'}
                  />
                  <p className="mb-2 text-xs text-muted">
                    Cancellazione definitiva: rimuove anagrafica, allegati e storico. Usala per il
                    diritto all’oblio o per i contatti che non tornano.
                  </p>
                  <Conferma
                    messaggio={`Eliminare definitivamente ${utente.nome} ${utente.cognome} e tutti i suoi dati?`}
                   icona="elimina">
            Elimina operatore
          </Conferma>
                </FormAzione>
              </div>
            </div>
          </Fisarmonica>

          <Fisarmonica titolo="Modifica anagrafica">
            <FormAzione azione={aggiornaProfilo}>
              <input type="hidden" name="userId" value={utente.id} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Nome *">
                  <input name="nome" required defaultValue={utente.nome} className="input" />
                </Campo>
                <Campo label="Cognome *">
                  <input name="cognome" required defaultValue={utente.cognome} className="input" />
                </Campo>
                <Campo label="Callsign">
                  <input name="callsign" defaultValue={utente.callsign ?? ''} className="input" />
                </Campo>
                <Campo label="Telefono">
                  <input name="telefono" defaultValue={utente.telefono ?? ''} className="input" />
                </Campo>
                <Campo label="Data di nascita">
                  <input
                    type="date"
                    name="dataNascita"
                    defaultValue={inputDate(utente.dataNascita)}
                    className="input"
                  />
                </Campo>
                <Campo label="Luogo di nascita">
                  <input
                    name="luogoNascita"
                    defaultValue={utente.luogoNascita ?? ''}
                    className="input"
                  />
                </Campo>
                <Campo label="Codice fiscale">
                  <input
                    name="codiceFiscale"
                    defaultValue={utente.codiceFiscale ?? ''}
                    className="input uppercase"
                  />
                </Campo>
                <Campo label="Indirizzo">
                  <input name="indirizzo" defaultValue={utente.indirizzo ?? ''} className="input" />
                </Campo>
                <Campo label="Città">
                  <input name="citta" defaultValue={utente.citta ?? ''} className="input" />
                </Campo>
                <Campo label="CAP / Provincia">
                  <div className="flex gap-2">
                    <input
                      name="cap"
                      defaultValue={utente.cap ?? ''}
                      className="input w-24"
                      placeholder="CAP"
                    />
                    <input
                      name="provincia"
                      defaultValue={utente.provincia ?? ''}
                      className="input w-20 uppercase"
                      placeholder="PR"
                    />
                  </div>
                </Campo>
                <Campo label="Contatto emergenza">
                  <input
                    name="emergenzaNome"
                    defaultValue={utente.emergenzaNome ?? ''}
                    className="input"
                  />
                </Campo>
                <Campo label="Tel. emergenza">
                  <input
                    name="emergenzaTel"
                    defaultValue={utente.emergenzaTel ?? ''}
                    className="input"
                  />
                </Campo>
                <Campo label="Gruppo sanguigno">
                  <input
                    name="gruppoSanguigno"
                    defaultValue={utente.gruppoSanguigno ?? ''}
                    className="input"
                  />
                </Campo>
                <Campo label="Allergie">
                  <input name="allergie" defaultValue={utente.allergie ?? ''} className="input" />
                </Campo>
              </div>
              <Invia icona="salva">
            Salva anagrafica
          </Invia>
            </FormAzione>
          </Fisarmonica>
        </div>
      )}

      {/* -------------------------------------------------- storico */}
      <div className="mt-8">
        <h2 className="titolo-sezione mb-3">Storico eventi</h2>
        <Partecipazioni rsvps={utente.rsvps} limite={20} />
      </div>
    </>
  );
}
