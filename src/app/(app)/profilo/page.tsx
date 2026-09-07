import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  etichettaRuolo,
  etichettaStato,
  statoEffettivo,
  tonoCertificato,
  tonoFigt,
  tonoIscrizione,
  tonoRuolo,
  tonoStato,
  vedeAreaTesseramento,
} from '@/lib/domain';
import { fmtDate, fmtEuro, iniziali, inputDate, umanizza } from '@/lib/format';
import { Partecipazioni } from '@/components/Partecipazioni';
import { Avatar, Badge, Campo, Intestazione, Statistica } from '@/components/ui';
import { Fisarmonica, FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { ModuloIscrizione } from '@/components/ModuloIscrizione';
import { FotoProfilo } from '@/components/FotoProfilo';
import { GRUPPI_SANGUIGNI } from '@/lib/medico';
import { aggiornaConsensi, aggiornaProfilo, cambiaPassword } from '@/actions/operatori';

function Dato({
  etichetta,
  valore,
  tono,
}: {
  etichetta: string;
  valore: string;
  tono?: 'warn';
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted">{etichetta}</p>
      <p className={`truncate text-sm ${tono === 'warn' ? 'text-warn' : 'text-ink'}`}>{valore}</p>
    </div>
  );
}

export default async function ProfiloPage() {
  const me = await requireUser();

  const utente = await prisma.user.findUniqueOrThrow({
    where: { id: me.id },
    include: {
      certificates: { orderBy: { createdAt: 'desc' } },
      memberships: { orderBy: { invitataIl: 'desc' }, include: { stagione: { select: { nome: true } } } },
      figtCards: { orderBy: { createdAt: 'desc' }, include: { stagione: { select: { nome: true } } } },
      payments: true,
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

  const tesserato = vedeAreaTesseramento(utente.stato);
  const certAttivo = utente.certificates.find((c) => statoEffettivo(c) === 'VALIDO');
  const daCompilare = utente.memberships.find((m) => m.status === 'INVITATA');
  const inValutazione = utente.memberships.find((m) => m.status === 'COMPILATA');

  // la scheda di emergenza è utile solo se c'è qualcuno da chiamare e un numero
  const iceCompleta = !!utente.emergenzaNome && !!utente.emergenzaTel;

  const svolti = utente.rsvps.filter((r) => new Date(r.event.inizio) < new Date());
  const presenze = svolti.filter((r) => r.presente === true).length;
  const adesioni = utente.rsvps.filter((r) => r.status === 'PRESENTE').length;
  const daSaldare = utente.payments
    .filter((p) => p.status === 'DA_PAGARE' || p.status === 'PARZIALE')
    .reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0);

  return (
    <>
      <Intestazione titolo="La mia pagina" sottotitolo="Dati personali, stato e storico operativo" />

      {/* -------------------------------------------------- testata */}
      <div className="card mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <FotoProfilo
          utenteId={utente.id}
          iniziali={iniziali(utente.nome, utente.cognome)}
          haFoto={!!utente.fotoPath}
        />
        <div className="flex-1">
          <h2 className="text-xl font-semibold">
            {utente.nome} {utente.cognome}
          </h2>
          {utente.callsign && <p className="text-sm text-nvg">&quot;{utente.callsign}&quot;</p>}
          <p className="mt-1 text-xs text-muted">{utente.email}</p>
          {utente.frase && (
            <p className="mt-2 border-l-2 border-nvg/40 pl-2 text-sm italic text-ink/80">
              {utente.frase}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tono={tonoStato[utente.stato]}>{etichettaStato[utente.stato]}</Badge>
          {utente.roles.map((r) => (
            <Badge key={r} tono={tonoRuolo[r]}>
              {etichettaRuolo[r]}
            </Badge>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------- iter di ingresso */}
      {daCompilare && (
        <div className="mb-6">
          <div className="mb-3 rounded-md border border-nvg/40 bg-nvg/10 px-4 py-3 text-sm text-nvg">
            Hai ricevuto una richiesta di{' '}
            <strong>{umanizza(daCompilare.tipo).toLowerCase()}</strong> per la stagione{' '}
            {daCompilare.stagione.nome}
            {daCompilare.quota && ` · quota prevista ${fmtEuro(Number(daCompilare.quota))}`}.
            Compila il modulo per inviarla in valutazione.
          </div>
          {daCompilare.messaggio && (
            <p className="mb-3 whitespace-pre-wrap rounded-md border border-line bg-surface2 px-4 py-3 text-sm">
              {daCompilare.messaggio}
            </p>
          )}
          <ModuloIscrizione iscrizioneId={daCompilare.id} utente={utente} />
        </div>
      )}

      {inValutazione && (
        <div className="mb-6 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          Modulo inviato il {fmtDate(inValutazione.compilataIl)}: la richiesta è in valutazione.
          Riceverai qui l’esito.
        </div>
      )}

      {utente.stato === 'NUOVO' && (
        <div className="mb-6 rounded-md border border-sky-400/40 bg-sky-400/10 px-4 py-3 text-sm text-sky-300">
          Sei un contatto del team: puoi vedere e partecipare agli eventi aperti. Quando il team
          deciderà di proporti l’ingresso, troverai qui il modulo di iscrizione.
        </div>
      )}

      {/* -------------------------------------------------- numeri */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica etichetta="Adesioni" valore={adesioni} dettaglio="eventi a cui hai detto sì" />
        <Statistica
          etichetta="Presenze confermate"
          valore={presenze}
          dettaglio={`su ${svolti.length} eventi svolti`}
          tono="ok"
        />
        {tesserato && (
          <Statistica
            etichetta="Certificato"
            valore={certAttivo ? 'Valido' : 'Non valido'}
            dettaglio={certAttivo?.scadeIl ? `fino al ${fmtDate(certAttivo.scadeIl)}` : undefined}
            tono={certAttivo ? 'ok' : 'danger'}
          />
        )}
        <Statistica
          etichetta="Da saldare"
          valore={fmtEuro(daSaldare)}
          tono={daSaldare > 0 ? 'warn' : 'ok'}
        />
      </div>

      {/* -------------------------------------------------- scheda emergenza */}
      <div className={`card mb-6 ${iceCompleta ? '' : 'border-warn/40'}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="titolo-sezione">In caso di emergenza</p>
          {!iceCompleta && <Badge tono="warn">da completare</Badge>}
        </div>

        {iceCompleta ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Dato etichetta="Chi avvisare" valore={utente.emergenzaNome ?? ''} />
            <Dato etichetta="Telefono" valore={utente.emergenzaTel ?? ''} />
            <Dato etichetta="Gruppo sanguigno" valore={utente.gruppoSanguigno ?? '—'} />
            <Dato
              etichetta="Allergie e note"
              valore={utente.allergie ? 'indicate' : 'nessuna'}
              tono={utente.allergie ? 'warn' : undefined}
            />
          </div>
        ) : (
          <p className="text-sm text-muted">
            Manca chi avvisare se ti succede qualcosa in campo. Compila la sezione{' '}
            <strong className="text-ink">Emergenze e dati sanitari</strong> qui sotto: sono i primi
            dati che il team cerca quando serve.
          </p>
        )}
      </div>

      {/* -------------------------------------------------- tesseramento (solo squadra) */}
      {tesserato && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="card">
            <p className="titolo-sezione mb-3">Iscrizione al club</p>
            {utente.memberships.length === 0 ? (
              <p className="text-sm text-muted">Nessuna iscrizione registrata.</p>
            ) : (
              <div className="space-y-2">
                {utente.memberships.map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-sm">
                    <span className="min-w-0">
                      {umanizza(i.tipo)} {i.stagione.nome}
                      {i.quota && (
                        <span className="text-muted num"> · {fmtEuro(Number(i.quota))}</span>
                      )}
                    </span>
                    <Badge tono={tonoIscrizione[i.status] ?? 'neutro'}>{umanizza(i.status)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <p className="titolo-sezione mb-3">Tessera federale</p>
            {utente.figtCards.length === 0 ? (
              <p className="text-sm text-muted">Nessuna tessera registrata.</p>
            ) : (
              <div className="space-y-2">
                {utente.figtCards.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span className="min-w-0">
                      <span className="num">{t.codice ?? 'codice non ancora assegnato'}</span>
                      <span className="block text-xs text-muted num">
                        {t.stagione.nome}
                        {t.scadeIl && ` · scade ${fmtDate(t.scadeIl)}`}
                      </span>
                    </span>
                    <Badge tono={tonoFigt[t.status] ?? 'neutro'}>{umanizza(t.status)}</Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-line pt-4">
              <p className="titolo-sezione mb-2">Certificati</p>
              {utente.certificates.length === 0 ? (
                <p className="text-sm text-muted">Nessun certificato caricato.</p>
              ) : (
                <div className="space-y-1.5">
                  {utente.certificates.slice(0, 3).map((c) => {
                    const s = statoEffettivo(c);
                    return (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted num">{fmtDate(c.scadeIl)}</span>
                        <Badge tono={tonoCertificato[s]}>{umanizza(s)}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link
                href="/certificati"
                className="mt-3 inline-block text-xs text-nvg hover:underline"
              >
                Gestisci certificati →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- anagrafica */}
      <Fisarmonica titolo="Anagrafica" apertoIniziale={!utente.dataNascita}>
        <FormAzione azione={aggiornaProfilo}>
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
            <Campo label="Frase" span>
              <input
                name="frase"
                maxLength={120}
                defaultValue={utente.frase ?? ''}
                className="input"
                placeholder="una riga sotto al tuo nome: un motto, il tuo ruolo, quello che vuoi"
              />
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
                maxLength={16}
                defaultValue={utente.codiceFiscale ?? ''}
                className="input uppercase"
              />
            </Campo>
          </div>
          <Invia icona="salva">Salva anagrafica</Invia>
        </FormAzione>
      </Fisarmonica>

      <Fisarmonica titolo="Recapiti" apertoIniziale={!utente.telefono}>
        <FormAzione azione={aggiornaProfilo}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Telefono">
              <input name="telefono" type="tel" defaultValue={utente.telefono ?? ''} className="input" />
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
                  maxLength={5}
                  defaultValue={utente.cap ?? ''}
                  className="input w-24"
                  placeholder="CAP"
                />
                <input
                  name="provincia"
                  maxLength={2}
                  defaultValue={utente.provincia ?? ''}
                  className="input w-20 uppercase"
                  placeholder="PR"
                />
              </div>
            </Campo>
          </div>
          <Invia icona="salva">Salva recapiti</Invia>
        </FormAzione>
      </Fisarmonica>

      {/* Emergenze: sono i dati che servono a chi presta i soccorsi, non
          anagrafica qualsiasi. Stanno in una sezione loro, in evidenza. */}
      <Fisarmonica titolo="Emergenze e dati sanitari" apertoIniziale={!iceCompleta}>
        <FormAzione azione={aggiornaProfilo}>
          <p className="mb-4 rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">
            Sono le informazioni che il team legge se ti succede qualcosa in campo. Li vedono solo
            l’admin, l’amministrazione e i Team Leader, nella sezione ICE.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Contatto di emergenza">
              <input
                name="emergenzaNome"
                defaultValue={utente.emergenzaNome ?? ''}
                className="input"
                placeholder="Chi avvisare: nome e parentela"
              />
            </Campo>
            <Campo label="Telefono emergenza">
              <input
                name="emergenzaTel"
                type="tel"
                defaultValue={utente.emergenzaTel ?? ''}
                className="input"
              />
            </Campo>
            <Campo label="Gruppo sanguigno">
              <select
                name="gruppoSanguigno"
                defaultValue={utente.gruppoSanguigno ?? ''}
                className="input"
              >
                <option value="">— non indicato —</option>
                {GRUPPI_SANGUIGNI.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Allergie e note mediche" span>
              <textarea
                name="allergie"
                rows={3}
                defaultValue={utente.allergie ?? ''}
                className="input"
                placeholder="Allergie, terapie in corso, patologie da segnalare a chi presta i soccorsi…"
              />
            </Campo>
          </div>
          <Invia icona="salva">Salva dati di emergenza</Invia>
        </FormAzione>
      </Fisarmonica>

      {/* -------------------------------------------------- privacy */}
      <Fisarmonica titolo="Privacy e consensi">
        <FormAzione azione={aggiornaConsensi}>
          <p className="text-sm text-muted">
            Informativa accettata il{' '}
            <span className="text-ink num">{fmtDate(utente.privacyAccettataIl)}</span>
            {utente.privacyVersione && ` (versione ${utente.privacyVersione})`}.{' '}
            <Link href="/privacy" target="_blank" className="text-nvg hover:underline">
              Rileggila
            </Link>
            .
          </p>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="consensoImmagini"
              defaultChecked={utente.consensoImmagini}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
            />
            <span className="min-w-0">
              Pubblicazione di foto e video che mi ritraggono
              {utente.consensoImmaginiIl && (
                <span className="block text-xs text-muted num">
                  prestato il {fmtDate(utente.consensoImmaginiIl)}
                </span>
              )}
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="consensoComunicaz"
              defaultChecked={utente.consensoComunicaz}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
            />
            <span>Comunicazioni non operative (iniziative, eventi esterni)</span>
          </label>

          <Invia icona="salva">
            Salva consensi
          </Invia>

          <p className="border-t border-line pt-4 text-xs text-muted">
            Puoi scaricare tutti i tuoi dati o chiederne la cancellazione dalla{' '}
            <Link href="/privacy" className="text-nvg hover:underline">
              pagina privacy
            </Link>
            .
          </p>
        </FormAzione>
      </Fisarmonica>

      <Fisarmonica titolo="Cambia password">
        <FormAzione azione={cambiaPassword}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo label="Password attuale">
              <input type="password" name="attuale" required className="input" />
            </Campo>
            <Campo label="Nuova password">
              <input type="password" name="nuova" required minLength={8} className="input" />
            </Campo>
            <Campo label="Conferma">
              <input type="password" name="conferma" required minLength={8} className="input" />
            </Campo>
          </div>
          <Invia icona="salva">
            Aggiorna password
          </Invia>
        </FormAzione>
      </Fisarmonica>

      {/* -------------------------------------------------- storico */}
      <div className="mt-6">
        <h2 className="titolo-sezione mb-3">Storico partecipazioni</h2>
        <Partecipazioni
          rsvps={utente.rsvps}
          limite={15}
          vuoto="Non hai ancora risposto a nessun evento."
        />
      </div>
    </>
  );
}
