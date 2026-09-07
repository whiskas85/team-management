import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elencoOperatori } from '@/lib/query';
import { URL_ASNWG, puoAmministrare, tonoFigt, vedeAreaTesseramento } from '@/lib/domain';
import { fmtDate, giorniA, nomeCompleto, umanizza } from '@/lib/format';
import { stagioneAttiva } from '@/lib/stagioni';
import { Badge, Campo, Elenco, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { Conferma, FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { Icona } from '@/components/Icona';
import { eliminaTessera } from '@/actions/tessere';
import {
  importaAnagrafiche,
  importaTessereFigt,
  proponiAbbinamenti,
  salvaCredenzialiFigt,
  scollegaFigt,
} from '@/actions/figt';
import { AbbinaTessere } from '@/components/AbbinaTessere';
import { GiacenzaPolizze } from '@/components/GiacenzaPolizze';

export default async function TesserePage() {
  await requirePermesso(puoAmministrare);
  const stagione = await stagioneAttiva();
  const annoCorrente = new Date().getFullYear();

  const [tessere, operatori, collegamento, importate] = await Promise.all([
    prisma.figtCard.findMany({
      orderBy: [{ stagione: { inizio: 'desc' } }, { status: 'asc' }],
      include: {
        user: { select: { id: true, nome: true, cognome: true, callsign: true } },
        stagione: { select: { nome: true } },
      },
    }),
    elencoOperatori(false),
    prisma.credenzialeFigt.findUnique({ where: { id: 'figt' } }),
    prisma.tesseramentoImportato.findMany({
      orderBy: [{ anno: 'desc' }, { nominativo: 'asc' }],
    }),
  ]);

  // quelle che il portale ha dato ma che nessuno ha ancora attribuito
  const daAssociare = importate.filter((t) => !t.userId);

  // La tessera federale riguarda chi è in squadra. Un contatto che viene alle
  // aperte non sarà mai tesserato — gioca con la giornaliera — e chi è da
  // riconfermare lo sarà semmai dopo aver rinnovato: segnalarli come "senza
  // tessera" riempie la pagina di allarmi su cui non c'è niente da fare.
  const daTesserare = operatori.filter((o) => vedeAreaTesseramento(o.stato));

  // e le persone che aspettano una tessera: due liste che si guardano
  const conTessera = new Set(tessere.map((t) => t.userId));
  const senzaTessera = operatori
    .filter((o) => !conTessera.has(o.id))
    .map((o) => ({
      id: o.id,
      nome: o.nome,
      cognome: o.cognome,
      callsign: o.callsign,
      email: o.email,
    }));

  const attive = tessere.filter((t) => t.status === 'ATTIVA');
  const daRecuperare = tessere.filter((t) => t.status === 'DA_RECUPERARE');
  const inScadenza = attive.filter((t) => {
    const g = giorniA(t.scadeIl);
    return g !== null && g >= 0 && g <= 60;
  });
  const conRiga = new Set(
    tessere.filter((t) => t.stagione.nome === stagione.nome).map((t) => t.userId),
  );
  const senzaRiga = daTesserare.filter((o) => !conRiga.has(o.id));

  return (
    <>
      <Intestazione
        titolo="Tessere FIGT"
        sottotitolo="Le tessere le emette la federazione: qui si importano dal portale e si associano alle persone"
        azioni={
          <div className="flex flex-wrap gap-2">
            <a href={URL_ASNWG} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
              <Icona nome="apri" size={15} /> Portale ASNWG
            </a>

            {collegamento && (
              <BottoneModale
                etichetta="Importa dal portale"
                icona="tessera"
                titolo="Importa i tesseramenti"
              >
                <FormAzione azione={importaTessereFigt}>
                  <p className="mb-4 text-sm text-muted">
                    Vengono lette le tessere dell’associazione per l’anno scelto e associate agli
                    operatori. Quelle che non si riesce ad attribuire con certezza restano da
                    assegnare a mano.
                  </p>
                  <Campo label="Anno di tesseramento">
                    <input
                      name="anno"
                      type="number"
                      defaultValue={annoCorrente}
                      className="input"
                    />
                  </Campo>
                  <Invia icona="tessera" attesa="Leggo il portale…">
                    Importa
                  </Invia>
                </FormAzione>
              </BottoneModale>
            )}

            {collegamento && (
              <BottoneModale
                etichetta="Importa anagrafiche"
                icona="operatori"
                titolo="Anagrafiche complete dal portale"
              >
                <FormAzione azione={importaAnagrafiche}>
                  <p className="mb-4 text-sm text-muted">
                    Apre la scheda di ogni tesserato e ne prende nascita, codice fiscale,
                    indirizzo e recapiti. Chi non c&rsquo;&egrave; viene creato come operatore in
                    squadra e iscritto alla stagione in corso; a chi c&rsquo;&egrave; gi&agrave;
                    vengono riempiti solo i campi vuoti, senza sovrascrivere nulla.
                  </p>
                  <p className="mb-4 text-xs text-muted">
                    Sono sole letture: non tocca niente sul portale.
                  </p>
                  <Invia icona="operatori" attesa="Leggo le schede…">
                    Importa le anagrafiche
                  </Invia>
                </FormAzione>
              </BottoneModale>
            )}

            <BottoneModale
              etichetta={collegamento ? 'Collegamento' : 'Collega il portale'}
              icona="modifica"
              titolo="Accesso al portale federale"
              className={collegamento ? 'btn-ghost btn-sm' : 'btn-primary'}
            >
              <FormAzione azione={salvaCredenzialiFigt}>
                {collegamento ? (
                  <p className="mb-4 rounded-md border border-nvg/40 bg-nvg/10 px-3 py-2 text-xs text-nvg">
                    Collegato come <strong>{collegamento.login}</strong>
                    {collegamento.ultimoAccesso
                      ? ` · ultimo accesso ${fmtDate(collegamento.ultimoAccesso)}`
                      : ''}
                    {collegamento.ultimoEsito ? ` · ${collegamento.ultimoEsito}` : ''}.
                  </p>
                ) : (
                  <p className="mb-4 text-sm text-muted">
                    Le credenziali del portale ASNWG. Vengono provate subito: se il portale non le
                    accetta non vengono salvate.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo label="Utenza *">
                    <input
                      name="login"
                      required
                      defaultValue={collegamento?.login ?? ''}
                      className="input"
                      autoComplete="username"
                    />
                  </Campo>
                  <Campo label="Password *">
                    <input
                      name="password"
                      type="password"
                      required
                      className="input"
                      autoComplete="current-password"
                      placeholder={collegamento ? 'riscrivila per cambiarla' : ''}
                    />
                  </Campo>
                  <Campo label="Id anagrafica dell’associazione *">
                    <input
                      name="idAnagrafica"
                      required
                      defaultValue={collegamento?.idAnagrafica ?? ''}
                      className="input"
                      placeholder="dopo idanagrafica= nell’indirizzo"
                    />
                  </Campo>
                  <Campo label="Id affiliazione">
                    <input
                      name="idAffiliazione"
                      defaultValue={collegamento?.idAffiliazione ?? ''}
                      className="input"
                      placeholder="dopo idaffiliazione= nell’indirizzo"
                    />
                    <p className="mt-1 text-[11px] text-muted">
                      Numero diverso dal precedente: lo usano le polizze prova, cioè le
                      giornaliere degli ospiti.
                    </p>
                  </Campo>
                </div>

                <p className="mt-2 text-[11px] text-muted">
                  La password viene ricordata cifrata. Non si può sostituire con un’impronta come
                  quelle di accesso al gestionale: per entrare nel portale serve in chiaro. La
                  legge solo il server, e solo durante l’importazione.
                </p>

                <Invia icona="salva" attesa="Verifico…">
                  {collegamento ? 'Aggiorna e ricorda' : 'Collega e ricorda'}
                </Invia>
              </FormAzione>
            </BottoneModale>

            {collegamento && (
              <AzioneBottone
                azione={scollegaFigt}
                valori={{}}
                icona="elimina"
                conferma="Dimenticare le credenziali del portale federale?"
                className="btn-danger btn-sm"
              >
                Scollega
              </AzioneBottone>
            )}
          </div>
        }
      />

      {!collegamento && (
        <div className="mb-6 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          Il portale federale non è ancora collegato: senza credenziali le tessere non si possono
          importare, e a mano non si creano — le emette la federazione.
        </div>
      )}

      {daAssociare.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="titolo-sezione">Da associare &middot; {daAssociare.length}</h2>
            <FormAzione azione={proponiAbbinamenti}>
              <Invia icona="operatori" className="btn-ghost btn-sm" attesa="Confronto...">
                Proponi abbinamenti
              </Invia>
            </FormAzione>
          </div>
          <p className="mb-3 text-xs text-muted">
            Il portale le ha restituite ma non si &egrave; capito di chi sono. &ldquo;Proponi
            abbinamenti&rdquo; aggancia solo quelle che riconosce senza dubbi &mdash; per email o
            per nome completo; le altre le accoppi tu. Meglio una riga in sospeso che una tessera
            attaccata alla persona sbagliata.
          </p>

          <AbbinaTessere
            tessere={daAssociare.map((t) => ({
              numero: t.numero,
              nominativo: t.nominativo,
              email: t.email,
              comune: t.comune,
              anno: t.anno,
              stato: t.stato,
            }))}
            operatori={senzaTessera}
          />
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Statistica etichetta="Attive" valore={attive.length} tono="ok" />
        <Statistica
          etichetta="Codice da recuperare"
          valore={daRecuperare.length}
          tono={daRecuperare.length ? 'warn' : 'ok'}
        />
        <Statistica
          etichetta="In scadenza"
          valore={inScadenza.length}
          dettaglio="entro 60 giorni"
          tono={inScadenza.length ? 'warn' : 'ok'}
        />
        <Statistica
          etichetta="Senza tessera"
          valore={senzaRiga.length}
          dettaglio={`stagione ${stagione.nome}`}
          tono={senzaRiga.length ? 'warn' : 'ok'}
        />
        <GiacenzaPolizze />
      </div>

      {senzaRiga.length > 0 && (
        <div className="mb-6 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {senzaRiga.length === 1
            ? '1 operatore in squadra non risulta tesserato'
            : `${senzaRiga.length} operatori in squadra non risultano tesserati`}{' '}
          per la stagione {stagione.nome}:{' '}
          {senzaRiga.map((o) => `${o.nome} ${o.cognome}`).join(', ')}. Se sul portale la tessera
          c’è, rilancia l’importazione; altrimenti va richiesta alla federazione.
        </div>
      )}

      {tessere.length === 0 ? (
        <Vuoto testo="Nessuna tessera registrata." />
      ) : (
        <Elenco
          cards={tessere.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{nomeCompleto(t.user)}</h3>
                  <p className="text-xs text-muted num">
                    {t.codice ?? 'codice da recuperare'} · {t.stagione.nome}
                  </p>
                  {t.scadeIl && (
                    <p className="text-xs text-muted num">scade {fmtDate(t.scadeIl)}</p>
                  )}
                </div>
                <Badge tono={tonoFigt[t.status] ?? 'neutro'}>{umanizza(t.status)}</Badge>
              </div>
              <Riga tessera={t} />
            </div>
          ))}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Operatore</th>
                  <th>Codice</th>
                  <th>Stagione</th>
                  <th>Scade</th>
                  <th>Verificato</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {tessere.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link
                        href={`/admin/operatori/${t.user.id}`}
                        className="font-medium hover:text-nvg"
                      >
                        {t.user.cognome} {t.user.nome}
                      </Link>
                    </td>
                    <td className="num">
                      {t.codice ?? <span className="text-xs text-warn">da recuperare</span>}
                    </td>
                    <td className="text-xs num">{t.stagione.nome}</td>
                    <td className="whitespace-nowrap text-muted num">{fmtDate(t.scadeIl)}</td>
                    <td className="whitespace-nowrap text-muted num">{fmtDate(t.verificatoIl)}</td>
                    <td>
                      <Badge tono={tonoFigt[t.status] ?? 'neutro'}>{umanizza(t.status)}</Badge>
                    </td>
                    <td className="min-w-[300px]">
                      <Riga tessera={t} />
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

/**
 * I dati della tessera non si modificano a mano: la verità è quella del
 * portale, e riscriverla qui vorrebbe dire farla divergere in silenzio.
 * Resta solo l'eliminazione, per ripulire un abbinamento sbagliato.
 */
function Riga({
  tessera,
}: {
  tessera: {
    id: string;
    codice: string | null;
    anno: number | null;
    nominativo: string | null;
    verificatoIl: Date | null;
  };
}) {
  return (
    <div className="mt-3 border-t border-line pt-3 md:mt-0 md:border-0 md:pt-0">
      <p className="text-[11px] text-muted">
        {tessera.nominativo ? `${tessera.nominativo} · ` : ''}
        {tessera.verificatoIl
          ? `letta dal portale il ${fmtDate(tessera.verificatoIl)}`
          : 'non ancora verificata sul portale'}
      </p>

      <FormAzione azione={eliminaTessera} className="mt-2">
        <input type="hidden" name="id" value={tessera.id} />
        <Conferma
          messaggio="Eliminare questa tessera? Serve solo per sciogliere un abbinamento sbagliato: alla prossima importazione tornerà dal portale."
          className="text-xs text-muted hover:text-danger"
          icona="elimina"
        >
          elimina
        </Conferma>
      </FormAzione>
    </div>
  );
}
