import Link from 'next/link';
import type { ScatenanteMessaggio } from '@prisma/client';
import { CodaWhatsapp, ModelliWhatsapp } from '@/components/ModelliWhatsapp';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { fmtDateTime } from '@/lib/format';
import { SCATENANTI } from '@/lib/messaggi';
import { gruppiWhatsapp, statoPonte, statoRubrica } from '@/lib/whatsapp';
import { Badge, Campo, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { CodiceWhatsapp } from '@/components/CodiceWhatsapp';
import {
  accendiTesto,
  aggiungiTesti,
  eliminaBozza,
  eliminaModello,
  eliminaTesto,
  inviaMessaggiPronti,
  preparaMessaggiDiOggi,
  preparaSollecito,
  ricominciaWhatsapp,
  rivendicaWhatsapp,
  salvaModello,
  salvaTesto,
  scegliGruppo,
  scollegaWhatsapp,
  aggiornaRubricaWhatsapp,
} from '@/actions/messaggi';
import { BottoneElimina, CardRiga } from '@/components/CardRiga';

// i messaggi del certificato in scadenza stanno in Certificati medici → WhatsApp
const ORDINE: ScatenanteMessaggio[] = ['COMPLEANNO', 'PROMEMORIA_ATTIVITA', 'QUOTA_APERTA', 'LIBERO'];

/**
 * Messaggi automatici verso WhatsApp.
 *
 * La pagina tiene insieme tre cose che vanno guardate una accanto all'altra:
 * se il numero è collegato, cosa il gestionale sa dire, e cosa partirebbe
 * adesso. Il passaggio dalla preparazione all'invio è volutamente manuale —
 * un messaggio sbagliato non si corregge dopo, è già sul telefono di qualcuno.
 */
export default async function MessaggiPage() {
  const me = await requirePermesso(isAdmin);

  const [ponte, collegamento, modelli, coda, ultimi, rubrica] = await Promise.all([
    statoPonte(),
    prisma.collegamentoWhatsapp.findUnique({
      where: { id: 'whatsapp' },
      include: { utente: { select: { nome: true, cognome: true, id: true } } },
    }),
    prisma.modelloMessaggio.findMany({
      where: { scatenante: { not: 'CERTIFICATO_IN_SCADENZA' } },
      orderBy: [{ scatenante: 'asc' }, { createdAt: 'asc' }],
      include: { testi: { orderBy: { createdAt: 'asc' } } },
    }),
    prisma.messaggioInviato.findMany({
      where: { stato: 'DA_MANDARE' },
      orderBy: { creatoIl: 'asc' },
    }),
    prisma.messaggioInviato.findMany({
      where: { stato: { not: 'DA_MANDARE' } },
      orderBy: { creatoIl: 'desc' },
      take: 15,
    }),
    statoRubrica(),
  ]);

  const mio = collegamento?.utenteId === me.id;
  const gruppi = ponte.collegato && mio ? await gruppiWhatsapp() : [];

  return (
    <>
      <Intestazione
        titolo="Messaggi"
        sottotitolo="Compleanni, promemoria e solleciti su WhatsApp — con il tuo numero"
      />

      <div className="mb-6 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
        Questo canale non è l’interfaccia ufficiale di WhatsApp: quella nei gruppi non scrive. Il
        gestionale si collega come farebbe un telefono, il che è fuori dai termini di servizio.
        Usalo con un <strong>numero dedicato</strong>, mai con quello personale, e non mandare
        raffiche: il rischio, se qualcosa va storto, è che quel numero venga bloccato.
      </div>

      {/* ---------------------------------------------------- collegamento */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="titolo-sezione">Numero collegato</p>
            {ponte.collegato ? (
              <p className="mt-1 text-sm">
                <span className="num">{ponte.numero ?? 'collegato'}</span>{' '}
                {collegamento?.utente ? (
                  <span className="text-muted">
                    · rivendicato da {collegamento.utente.nome} {collegamento.utente.cognome}
                  </span>
                ) : (
                  <span className="text-warn">· da rivendicare</span>
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">
                {ponte.errore ?? 'Nessun numero collegato.'}
              </p>
            )}
            {collegamento?.ultimoInvio && (
              <p className="num mt-1 text-xs text-muted">
                Ultimo invio {fmtDateTime(collegamento.ultimoInvio)} · {collegamento.ultimoEsito}
              </p>
            )}
            {/* Cosa sa il ponte della rubrica: serve a capire perché un nome
                non si trova — mai arrivato, arrivato senza numero, o la
                richiesta è andata storta */}
            {rubrica && (
              <p className="num mt-1 text-xs text-muted">
                Rubrica: {rubrica.totale} numeri · {rubrica.conNome} col nome
                {rubrica.nomiSenzaNumero ? ` · ${rubrica.nomiSenzaNumero} nomi senza numero` : ''}
                {rubrica.ultimaRichiesta
                  ? ` · ultima richiesta ${fmtDateTime(new Date(rubrica.ultimaRichiesta))}${
                      rubrica.esito ? `: ${rubrica.esito}` : ''
                    }`
                  : ''}
              </p>
            )}
            {/* il perché di un «arrivati 0 contatti»: la libreria lo scrive
                solo nel suo registro */}
            {rubrica?.registro && rubrica.registro.length > 0 && (
              <details className="mt-1 text-xs text-muted">
                <summary className="cursor-pointer">
                  Cosa ha risposto WhatsApp ({rubrica.registro.length} righe)
                </summary>
                <ul className="num mt-1 space-y-0.5 break-words rounded-md border border-line bg-surface2 p-2">
                  {rubrica.registro.map((r, i) => (
                    <li key={i}>
                      <span className="text-muted">
                        {new Date(r.ora).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome' })}
                      </span>{' '}
                      <span className="text-ink">{r.msg}</span>
                      {r.errore && <span className="block text-danger">{r.errore}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {ponte.collegato && !mio && (
              <FormAzione azione={rivendicaWhatsapp} className="contents">
                <Invia icona="chiave">Rivendica il collegamento</Invia>
              </FormAzione>
            )}
            {ponte.collegato && (
              <FormAzione azione={aggiornaRubricaWhatsapp} className="contents">
                <Invia icona="riapri" className="btn-ghost btn-sm">
                  Aggiorna rubrica
                </Invia>
              </FormAzione>
            )}
            {mio && (
              <FormAzione azione={scollegaWhatsapp} className="contents">
                <Invia icona="esci" className="btn-danger btn-sm">
                  Scollega
                </Invia>
              </FormAzione>
            )}
            {/* La via d'uscita quando il ponte è incastrato: sessione chiusa da
                WhatsApp, nessun codice, e "Scollega" che non compare perché
                quel collegamento non risulta di nessuno. */}
            {!ponte.collegato && (
              <FormAzione azione={ricominciaWhatsapp} className="contents">
                <Invia icona="riapri" className="btn-ghost btn-sm">
                  Ricomincia il collegamento
                </Invia>
              </FormAzione>
            )}
          </div>
        </div>

        {/* Il codice si inquadra una volta sola — poi la sessione resta nel
            volume — ma va inseguito mentre si inquadra: WhatsApp lo cambia
            ogni venti secondi, e il riquadro se lo riprende da solo. */}
        {!ponte.collegato && <CodiceWhatsapp iniziale={ponte} />}

        {mio && (
          <div className="mt-4 border-t border-line pt-4">
            <FormAzione azione={scegliGruppo} className="flex flex-wrap items-end gap-2">
              <Campo label="Gruppo su cui scrivere">
                <select
                  name="gruppoId"
                  defaultValue={collegamento?.gruppoId ?? ''}
                  className="input w-72"
                >
                  <option value="">— scegli —</option>
                  {gruppi.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nome} ({g.partecipanti})
                    </option>
                  ))}
                </select>
              </Campo>
              <Invia icona="salva" className="btn-ghost btn-sm">
                Usa questo gruppo
              </Invia>
              {collegamento?.gruppoNome && (
                <span className="pb-2 text-xs text-muted">
                  adesso: <strong className="text-ink">{collegamento.gruppoNome}</strong>
                </span>
              )}
            </FormAzione>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- coda */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica etichetta="In attesa di partire" valore={coda.length} tono={coda.length ? 'warn' : 'ok'} />
        <Statistica etichetta="Modelli attivi" valore={modelli.filter((m) => m.attivo).length} />
        <Statistica
          etichetta="Gruppo predefinito"
          valore={collegamento?.gruppoNome ?? '—'}
          tono={collegamento?.gruppoId ? 'ok' : 'neutro'}
        />
        <Statistica
          etichetta="Stato ponte"
          valore={ponte.collegato ? 'collegato' : 'spento'}
          tono={ponte.collegato ? 'ok' : 'danger'}
        />
      </div>

      <div className="card mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="titolo-sezione">Da mandare</p>
          <div className="flex flex-wrap gap-2">
            <FormAzione azione={preparaMessaggiDiOggi} className="contents">
              <Invia icona="calendario" className="btn-ghost btn-sm">
                Prepara quelli di oggi
              </Invia>
            </FormAzione>
            <FormAzione azione={preparaSollecito} className="contents">
              <input type="hidden" name="scatenante" value="QUOTA_APERTA" />
              <Invia icona="pagamenti" className="btn-ghost btn-sm">
                Solleciti quote
              </Invia>
            </FormAzione>
          </div>
        </div>

        <CodaWhatsapp coda={coda} />
      </div>

      {/* ---------------------------------------------------- modelli */}
      <p className="mb-4 text-xs text-muted">
        I messaggi per il certificato in scadenza sono in{' '}
        <Link href="/admin/certificati?scheda=whatsapp" className="text-nvg hover:underline">
          Certificati medici → WhatsApp
        </Link>
        .
      </p>
      <ModelliWhatsapp modelli={modelli} gruppi={gruppi} ordine={ORDINE} />

      {/* ---------------------------------------------------- registro */}
      {ultimi.length > 0 && (
        <div className="mt-8">
          <h2 className="titolo-sezione mb-3">Ultimi inviati</h2>
          <div className="space-y-2">
            {ultimi.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs"
              >
                <Badge tono={m.stato === 'INVIATO' ? 'ok' : 'danger'}>
                  {m.stato === 'INVIATO' ? 'inviato' : 'errore'}
                </Badge>
                <span className="text-muted">{m.aChi}</span>
                <span className="min-w-0 flex-1 break-words">{m.testo}</span>
                <span className="num text-muted">
                  {fmtDateTime(m.inviatoIl ?? m.creatoIl)}
                </span>
                {m.stato === 'ERRORE' && m.esito && (
                  <span className="w-full text-danger">{m.esito}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
