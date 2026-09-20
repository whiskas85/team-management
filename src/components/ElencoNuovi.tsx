'use client';

import Link from 'next/link';
import type { StatoOperatore } from '@prisma/client';
import { Avatar, Badge, Campo, Elenco, Vuoto } from './ui';
import { ListaFiltrata } from './Filtri';
import { BottoneModale } from './Modale';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { Icona } from './Icona';
import { daQuanto } from '@/lib/format';
import { STATI_CONTATTO, etichettaStato, tonoStato } from '@/lib/domain';
import { inviaRichiesta } from '@/actions/iscrizioni';
import { CampiRichiesta, type VoceListino } from './CampiRichiesta';
import { eliminaOperatore } from '@/actions/operatori';
import { BottoneElimina } from './CardRiga';

export type RigaNuovo = {
  id: string;
  nome: string;
  cognome: string;
  callsign: string | null;
  email: string;
  telefono: string | null;
  stato: StatoOperatore;
  registrato: string;
  /** Registrazione che chi sta guardando non ha ancora aperto. */
  daLeggere: boolean;
  ultimoAccesso: string | null;
  /**
   * Ha acceso le notifiche sul telefono.
   *
   * Cambia **come lo si avvisa**: chi le ha accese riceve la notifica, agli
   * altri parte un WhatsApp. Saperlo guardando l'elenco evita di scrivere a
   * mano a uno che sarebbe stato avvisato da solo -- e di dare per avvisato
   * uno che non lo e'.
   */
  avvisi: boolean;
  /** Quante volte ha detto «ci sono». */
  adesioni: number;
  /** Quante volte c'era davvero, all'appello. */
  presenze: number;
  ultimaPresenza: string | null;
  /** Da quanti giorni non si presenta. Nullo se non e' mai venuto. */
  giorniDaUltima: number | null;
  haIscrizione: boolean;
};

export function ElencoNuovi({
  righe,
  stagioni,
  stagioneId,
  listino,
  puoInvitare,
  puoEliminare,
}: {
  righe: RigaNuovo[];
  stagioni: { id: string; nome: string }[];
  stagioneId: string;
  listino: VoceListino[];
  puoInvitare: boolean;
  puoEliminare: boolean;
}) {
  return (
    <ListaFiltrata
      elementi={righe}
      segnaposto="Nome, callsign, email o telefono…"
      cerca={(n) => `${n.nome} ${n.cognome} ${n.callsign ?? ''} ${n.email} ${n.telefono ?? ''}`}
      filtri={[
        {
          nome: 'stato',
          etichetta: 'Stato',
          opzioni: STATI_CONTATTO.map((s) => ({ valore: s, testo: etichettaStato[s] })),
        },
      ]}
      valoreFiltro={(n) => n.stato}
    >
      {(lista) =>
        lista.length === 0 ? (
          <Vuoto testo="Nessun nuovo contatto." />
        ) : (
          <Elenco
            cards={lista.map((n) => (
              <div
                key={n.id}
                className={`card ${n.daLeggere ? 'border-nvg/50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar iniziali={`${n.nome[0] ?? ''}${n.cognome[0] ?? ''}`.toUpperCase()} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/operatori/${n.id}`}
                      className="block break-words font-medium hover:text-nvg"
                    >
                      {n.daLeggere && (
                        <span
                          className="mr-1.5 inline-block h-2 w-2 rounded-full bg-nvg align-middle"
                          title="Non hai ancora aperto questa scheda"
                        />
                      )}
                      {n.cognome} {n.nome}
                    </Link>
                    <p className="break-all text-xs text-muted">{n.email}</p>
                    <p className="text-xs num">
                      <span className="text-nvg">{n.presenze}</span>{' '}
                      <span className="text-muted">
                        {n.presenze === 1 ? 'volta venuto' : 'volte venuto'} su {n.adesioni}{' '}
                        {n.adesioni === 1 ? 'segnata' : 'segnate'}
                      </span>
                    </p>
                    <p className="text-xs text-muted num">
                      {n.giorniDaUltima === null
                        ? 'mai venuto'
                        : `ultima volta ${daQuanto(n.giorniDaUltima)} fa`}
                    </p>
                  </div>
                  {puoEliminare && (
                    <div className="-mr-1 -mt-1 shrink-0">
                      <EliminaNuovo riga={n} />
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {n.stato !== 'NUOVO' && (
                    <Badge tono={tonoStato[n.stato]}>{etichettaStato[n.stato]}</Badge>
                  )}
                  {/* come lo si raggiunge: campanella accesa, notifica sul
                      telefono; spenta, WhatsApp */}
                  <span
                    className={n.avvisi ? 'text-nvg' : 'text-muted/40'}
                    title={
                      n.avvisi
                        ? 'Riceve le notifiche sul telefono'
                        : 'Niente notifiche: lo si avvisa su WhatsApp'
                    }
                  >
                    <Icona nome="avvisi" size={15} />
                  </span>
                </div>
                {puoInvitare && !n.haIscrizione && (
                  <div className="piede">
                    <Azioni
                      riga={n}
                      stagioni={stagioni}
                      stagioneId={stagioneId}
                      listino={listino}
                      puoInvitare={puoInvitare}
                    />
                  </div>
                )}
              </div>
            ))}
            tabella={
              <table className="tabella">
                <thead>
                  <tr>
                    <th>Contatto</th>
                    <th>Recapiti</th>
                    <th>Registrato</th>
                    <th>Ultimo accesso</th>
                    <th>Avvisi</th>
                    <th>Venuto</th>
                    <th>Segnato</th>
                    <th>Ultima volta</th>
                    <th>Da quanto</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <Link
                          href={`/admin/operatori/${n.id}`}
                          className="font-medium hover:text-nvg"
                        >
                          {n.daLeggere && (
                            <span
                              className="mr-1.5 inline-block h-2 w-2 rounded-full bg-nvg align-middle"
                              title="Non hai ancora aperto questa scheda"
                            />
                          )}
                          {n.cognome} {n.nome}
                        </Link>
                        {n.callsign && (
                          <span className="block text-[11px] text-nvg">{n.callsign}</span>
                        )}
                        {/* In una tabella di nuovi, «Nuovo» su ogni riga non
                            dice niente. Gli altri stati si': uno deve ancora
                            compilare l'invito, uno aspetta la valutazione, uno
                            e' stato rifiutato -- e quelli vanno visti. */}
                        {n.stato !== 'NUOVO' && (
                          <span className="mt-0.5 block">
                            <Badge tono={tonoStato[n.stato]}>{etichettaStato[n.stato]}</Badge>
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-muted">
                        {n.email}
                        {n.telefono && <span className="block num">{n.telefono}</span>}
                      </td>
                      <td className="whitespace-nowrap text-muted num">{n.registrato}</td>
                      <td className="whitespace-nowrap text-muted num">
                        {n.ultimoAccesso ?? 'mai'}
                      </td>
                      {/* La campanella accesa vuol dire che l'avviso arriva
                          sul telefono; spenta, che partira' un WhatsApp. Non
                          e' un difetto da correggere: e' come lo si raggiunge. */}
                      <td>
                        <span
                          className={n.avvisi ? 'text-nvg' : 'text-muted/40'}
                          title={
                            n.avvisi
                              ? 'Riceve le notifiche sul telefono'
                              : 'Niente notifiche: lo si avvisa su WhatsApp'
                          }
                        >
                          <Icona nome="avvisi" size={16} />
                        </span>
                      </td>
                      {/* Due colonne e non una frazione: «2/4» va spiegato
                          ogni volta, e domani va spiegato di nuovo. Quante
                          volte e' venuto e quante volte si era segnato sono
                          due numeri diversi, e si leggono da soli. */}
                      <td className="num">
                        <span className={n.presenze > 0 ? 'text-nvg' : 'text-muted'}>
                          {n.presenze}
                        </span>
                      </td>
                      <td className="num text-muted">{n.adesioni}</td>
                      <td
                        className={`whitespace-nowrap num ${
                          n.ultimaPresenza ? 'text-muted' : 'text-danger'
                        }`}
                      >
                        {n.ultimaPresenza ?? 'mai venuto'}
                      </td>
                      {/* Da quanto non si vede: una data costringe a fare la
                          sottrazione a mente, e in venti righe nessuno la fa.
                          Sopra i tre mesi diventa rosso, perche' quello e' uno
                          che se n'e' andato senza dirlo. */}
                      <td
                        className={`whitespace-nowrap num ${
                          n.giorniDaUltima === null || n.giorniDaUltima > 90
                            ? 'text-danger'
                            : n.giorniDaUltima > 30
                              ? 'text-warn'
                              : 'text-muted'
                        }`}
                      >
                        {n.giorniDaUltima === null ? '—' : daQuanto(n.giorniDaUltima)}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Azioni
                            riga={n}
                            stagioni={stagioni}
                            stagioneId={stagioneId}
                            listino={listino}
                            puoInvitare={puoInvitare}
                          />
                          {puoEliminare && <EliminaNuovo riga={n} />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          />
        )
      }
    </ListaFiltrata>
  );
}

function Azioni({
  riga,
  stagioni,
  stagioneId,
  listino,
  puoInvitare,
}: {
  riga: RigaNuovo;
  stagioni: { id: string; nome: string }[];
  stagioneId: string;
  listino: VoceListino[];
  puoInvitare: boolean;
}) {
  return (
    <>
      {puoInvitare && !riga.haIscrizione && (
        <BottoneModale
          etichetta="Invita"
          icona="invita"
          titolo={`Richiesta di iscrizione a ${riga.nome} ${riga.cognome}`}
          className="btn-ghost btn-sm"
        >
          <FormAzione azione={inviaRichiesta}>
            <input type="hidden" name="userId" value={riga.id} />

            {/* stessi campi dell'invio massivo: un solo componente, così i due
                moduli non possono più raccontare cose diverse */}
            <CampiRichiesta
              stagioni={stagioni}
              stagioneId={stagioneId}
              listino={listino}
              tipoIniziale={riga.stato === 'NUOVO' ? 'ISCRIZIONE' : 'REISCRIZIONE'}
            />

            <div className="mt-4">
              <Campo label="Messaggio" span>
                <textarea
                  name="messaggio"
                  rows={3}
                  className="input"
                  placeholder="Cosa deve sapere prima di compilare il modulo…"
                />
              </Campo>
            </div>

            <Invia icona="rilascia">Invia richiesta</Invia>
            <p className="text-xs text-muted">
              Passerà in “attesa compilazione”: troverà il modulo nella sua pagina personale.
            </p>
          </FormAzione>
        </BottoneModale>
      )}

    </>
  );
}

/** Il cestino di un contatto: in alto a destra della sua card. */
function EliminaNuovo({ riga }: { riga: RigaNuovo }) {
  return (
    <BottoneElimina
      azione={eliminaOperatore}
      valori={{ userId: riga.id, ritorno: '/admin/nuovi' }}
      conferma={`Eliminare definitivamente ${riga.nome} ${riga.cognome}? L'operazione non è reversibile.`}
      etichetta={`Elimina ${riga.nome} ${riga.cognome}`}
    />
  );
}
