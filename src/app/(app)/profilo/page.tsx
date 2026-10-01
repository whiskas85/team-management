import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  GIORNI_PREAVVISO_SCADENZA,
  etichettaRuolo,
  etichettaStato,
  statoEffettivo,
  tonoFigt,
  tonoRuolo,
  tonoStato,
  vedeAreaTesseramento,
  vedeAttivitaSquadra,
} from '@/lib/domain';
import { fmtDate, fmtEuro, giorniA, iniziali, inputDate, umanizza } from '@/lib/format';
import { Partecipazioni } from '@/components/Partecipazioni';
import { impegni } from '@/lib/impegni';
import { daSaldare } from '@/lib/da-saldare';
import { Avatar, Badge, Campo, Intestazione, Statistica } from '@/components/ui';
import { Fisarmonica, FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { ModuloIscrizione } from '@/components/ModuloIscrizione';
import { FotoProfilo } from '@/components/FotoProfilo';
import { Notifiche } from '@/components/Notifiche';
import { GRUPPI_SANGUIGNI } from '@/lib/medico';
import { aggiornaConsensi, aggiornaProfilo, cambiaPassword } from '@/actions/operatori';
import { CampoTelefono } from '@/components/CampoTelefono';
import { SceltaAspetto } from '@/components/SceltaAspetto';
import { MetodiPersonali } from '@/components/MetodiPersonali';
import { temaSquadra } from '@/lib/tema-server';
import { eTemaPersonale } from '@/lib/tema';

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
      <p className={`break-all text-sm ${tono === 'warn' ? 'text-warn' : 'text-ink'}`}>{valore}</p>
    </div>
  );
}

export default async function ProfiloPage() {
  const me = await requireUser();

  const utente = await prisma.user.findUniqueOrThrow({
    where: { id: me.id },
    include: {
      certificates: { orderBy: { createdAt: 'desc' } },
      memberships: {
        orderBy: { invitataIl: 'desc' },
        include: { stagione: { select: { nome: true, inizio: true } } },
      },
      figtCards: { orderBy: { createdAt: 'desc' }, include: { stagione: { select: { nome: true } } } },
      payments: true,
      rsvps: {
        include: {
          // l'id serve perché dalla riga si va sull'attività
          event: {
            select: {
              id: true,
              titolo: true,
              inizio: true,
              fine: true,
              status: true,
              collegatoAId: true,
              tipo: { select: { nome: true } },
            },
          },
        },
        orderBy: { respondedAt: 'desc' },
      },
    },
  });

  const tesserato = vedeAreaTesseramento(utente.stato);
  const daCompilare = utente.memberships.find((m) => m.status === 'INVITATA');
  const inValutazione = utente.memberships.find((m) => m.status === 'COMPILATA');

  // la scheda di emergenza è utile solo se c'è qualcuno da chiamare e un numero
  const iceCompleta = !!utente.emergenzaNome && !!utente.emergenzaTel;

  /*
   * Le giornate annullate non sono storia di nessuno.
   *
   * Una gara saltata per la pioggia non dice niente su chi c'era: non ci è
   * stato nessuno. Lasciarla nello storico personale — con accanto «Presente»,
   * perché quel sì era stato detto davvero — racconta una partecipazione che
   * non è avvenuta, e sporca il conto di chi guarda quante volte è venuto.
   */
  const partecipazioni = utente.rsvps.filter((r) => r.event.status !== 'ANNULLATA');

  /*
   * Le partecipazioni di quest'anno: sono quelle che si guardano. Quelle
   * degli anni prima sono storia, e stanno nello storico del calendario.
   */
  const anno = new Date().getFullYear();
  const dellAnno = partecipazioni.filter((r) => new Date(r.event.inizio).getFullYear() === anno);

  /*
   * Le presenze di quest'anno, contate a giornate come in home: due attività
   * della stessa domenica sono una giornata sola per chi c'era.
   */
  const gruppiImpegni = impegni(
    dellAnno.map((r) => ({
      id: r.eventId,
      inizio: r.event.inizio,
      fine: r.event.fine,
      collegatoAId: r.event.collegatoAId,
    })),
  );
  const presenzeAnno = new Set(
    dellAnno
      .filter((r) => r.presente === true)
      .map((r) => gruppiImpegni.get(r.eventId) ?? r.eventId),
  ).size;

  // il certificato che vale adesso: se ce ne sono due, quello che scade più tardi
  const certValido = utente.certificates
    .filter((c) => statoEffettivo(c) === 'VALIDO' && c.scadeIl)
    .sort((x, y) => new Date(y.scadeIl!).getTime() - new Date(x.scadeIl!).getTime())[0];
  const giorniCert = certValido ? giorniA(certValido.scadeIl) : null;
  const certInScadenza = giorniCert !== null && giorniCert <= GIORNI_PREAVVISO_SCADENZA;

  const tessera = utente.figtCards[0];

  /*
   * Da quanto sei nel club: dalla prima stagione con l'iscrizione approvata.
   * Le iscrizioni una per una non dicono niente a chi le guarda; quanti anni
   * sono, sì.
   */
  const primaStagione = utente.memberships
    .filter((m) => m.status === 'ATTIVA' || m.status === 'SCADUTA')
    .sort((x, y) => x.stagione.inizio.getTime() - y.stagione.inizio.getTime())[0]?.stagione;
  const anniNelClub = primaStagione
    ? Math.floor((Date.now() - primaStagione.inizio.getTime()) / (365.25 * 86_400_000))
    : null;

  const conto = daSaldare(utente.payments);
  // il credito versato e non ancora usato, in tutte le casse
  const credito = Number(
    (
      await prisma.movimentoCredito.aggregate({
        where: { userId: utente.id },
        _sum: { importo: true },
      })
    )._sum.importo ?? 0,
  );

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
        <div className="mb-6 rounded-md border border-info/40 bg-info/10 px-4 py-3 text-sm text-info">
          Sei un contatto del team: puoi vedere e partecipare agli eventi aperti. Quando il team
          deciderà di proporti l’ingresso, troverai qui il modulo di iscrizione.
        </div>
      )}

      {/* Due colonne: a sinistra quello che sei e quello che compili, a
          destra le partecipazioni dell'anno — da scorrere senza perdere il
          resto. Sul telefono le partecipazioni vanno in fondo. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="min-w-0">
      {/* -------------------------------------------------- numeri */}
      {/* Ogni riquadro porta dove quella cosa si guarda o si sistema: il
          certificato alla sua pagina, i soldi ai pagamenti. */}
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Statistica
          etichetta="Presenze"
          valore={presenzeAnno}
          dettaglio={`giornate in campo nel ${anno}`}
          tono={presenzeAnno > 0 ? 'ok' : 'neutro'}
          href="/calendario?vista=passati"
        />
        {tesserato && (
          <Statistica
            etichetta="Certificato"
            valore={certValido ? 'Valido' : 'Non valido'}
            dettaglio={
              certValido ? (
                <>
                  <span className="block">
                    fino al {fmtDate(certValido.scadeIl)} ·{' '}
                    {certValido.tipo === 'AGONISTICO' ? 'agonistico' : 'non agonistico'}
                  </span>
                  {giorniCert !== null && (
                    // sotto la soglia di preavviso i giorni si accendono:
                    // è il tempo che serve per prenotare la visita
                    <span className={`num block ${certInScadenza ? 'font-semibold text-warn' : ''}`}>
                      {giorniCert === 0
                        ? 'scade oggi'
                        : `${giorniCert} ${giorniCert === 1 ? 'giorno' : 'giorni'} alla scadenza`}
                    </span>
                  )}
                </>
              ) : (
                'caricane uno per scendere in campo'
              )
            }
            tono={certValido ? (certInScadenza ? 'warn' : 'ok') : 'danger'}
            href="/certificati"
          />
        )}
        {tesserato && (
          <Statistica
            etichetta="Tessera FIGT"
            valore={tessera ? umanizza(tessera.status) : 'Nessuna'}
            dettaglio={
              tessera
                ? [
                    tessera.codice ?? 'codice da assegnare',
                    tessera.scadeIl ? `scade ${fmtDate(tessera.scadeIl)}` : tessera.stagione.nome,
                  ].join(' · ')
                : 'non ancora registrata'
            }
            tono={tessera ? (tonoFigt[tessera.status] ?? 'neutro') : 'warn'}
            href="/certificati#tessera"
          />
        )}
        <Statistica
          etichetta="Da saldare"
          valore={fmtEuro(conto.importo)}
          dettaglio={
            [
              conto.inVerifica > 0 ? `${fmtEuro(conto.inVerifica)} in verifica` : null,
              credito > 0.001 ? `${fmtEuro(credito)} di credito` : null,
            ]
              .filter(Boolean)
              .join(' · ') || undefined
          }
          tono={conto.importo > 0 ? 'warn' : conto.inVerifica > 0 ? 'info' : 'ok'}
          href="/pagamenti"
        />
        {/* il credito: soldi già in cassa, da spendere quando si paga */}
        {credito > 0.001 && (
          <Statistica
            etichetta="Credito"
            valore={fmtEuro(credito)}
            dettaglio="lo usi quando paghi una quota"
            tono="ok"
            href="/pagamenti"
          />
        )}
        {tesserato && (
          <Statistica
            etichetta="Nel club da"
            valore={
              anniNelClub === null
                ? '—'
                : anniNelClub < 1
                  ? 'Primo anno'
                  : `${anniNelClub} ${anniNelClub === 1 ? 'anno' : 'anni'}`
            }
            dettaglio={
              primaStagione ? `dalla stagione ${primaStagione.nome}` : 'nessuna iscrizione registrata'
            }
            tono={anniNelClub !== null ? 'ok' : 'neutro'}
          />
        )}
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

      {/* -------------------------------------------------- notifiche */}
      <div className="mb-4">
        <Notifiche />
      </div>

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
              <CampoTelefono name="telefono" defaultValue={utente.telefono} />
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
              <CampoTelefono
                name="emergenzaTel"
                defaultValue={utente.emergenzaTel}
                campoNome="emergenzaNome"
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

      {/* ------------------------------------------- come essere pagato */}
      {vedeAttivitaSquadra(utente.stato) && (
        <Fisarmonica titolo="Come essere pagato">
          <MetodiPersonali
            metodi={await prisma.metodoPersonale.findMany({
              where: { userId: utente.id },
              orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
              select: { id: true, nome: true, istruzioni: true },
            })}
          />
        </Fisarmonica>
      )}

      {/* -------------------------------------------------- aspetto */}
      <Fisarmonica titolo="Aspetto e accessibilità">
        <SceltaAspetto
          squadra={await temaSquadra()}
          tema={eTemaPersonale(utente.tema) ? utente.tema : 'squadra'}
          testoGrande={utente.testoGrande}
          testoGrandeMobile={utente.testoGrandeMobile}
        />
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

      </div>

      {/* -------------------------------------------------- partecipazioni */}
      <aside className="min-w-0">
        <h2 className="titolo-sezione mb-3">Partecipazioni {anno}</h2>
        <Partecipazioni
          rsvps={dellAnno}
          limite={50}
          vuoto={`Nessuna partecipazione nel ${anno}.`}
        />
      </aside>
      </div>
    </>
  );
}
