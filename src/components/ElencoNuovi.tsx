'use client';

import Link from 'next/link';
import type { StatoOperatore } from '@prisma/client';
import { Avatar, Badge, Campo, Elenco, Vuoto } from './ui';
import { ListaFiltrata } from './Filtri';
import { BottoneModale } from './Modale';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { AzioneBottone } from './AzioneBottone';
import { STATI_CONTATTO, etichettaStato, tonoStato } from '@/lib/domain';
import { inviaRichiesta } from '@/actions/iscrizioni';
import { CampiRichiesta, type VoceListino } from './CampiRichiesta';
import { eliminaOperatore } from '@/actions/operatori';

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
  adesioni: number;
  presenze: number;
  ultimaPresenza: string | null;
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
                      className="block truncate font-medium hover:text-nvg"
                    >
                      {n.daLeggere && (
                        <span
                          className="mr-1.5 inline-block h-2 w-2 rounded-full bg-nvg align-middle"
                          title="Non hai ancora aperto questa scheda"
                        />
                      )}
                      {n.cognome} {n.nome}
                    </Link>
                    <p className="truncate text-xs text-muted">{n.email}</p>
                    <p className="text-xs text-muted num">
                      {n.presenze} presenze · ultima {n.ultimaPresenza ?? 'mai'}
                    </p>
                  </div>
                  <Badge tono={tonoStato[n.stato]}>{etichettaStato[n.stato]}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <Azioni
                    riga={n}
                    stagioni={stagioni}
                    stagioneId={stagioneId}
                    listino={listino}
                    puoInvitare={puoInvitare}
                    puoEliminare={puoEliminare}
                  />
                </div>
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
                    <th>Presenze</th>
                    <th>Ultima volta</th>
                    <th>Stato</th>
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
                      </td>
                      <td className="text-xs text-muted">
                        {n.email}
                        {n.telefono && <span className="block num">{n.telefono}</span>}
                      </td>
                      <td className="whitespace-nowrap text-muted num">{n.registrato}</td>
                      <td className="whitespace-nowrap text-muted num">
                        {n.ultimoAccesso ?? 'mai'}
                      </td>
                      <td className="text-muted num">
                        {n.presenze}/{n.adesioni}
                      </td>
                      <td
                        className={`whitespace-nowrap num ${
                          n.ultimaPresenza ? 'text-muted' : 'text-danger'
                        }`}
                      >
                        {n.ultimaPresenza ?? 'mai venuto'}
                      </td>
                      <td>
                        <Badge tono={tonoStato[n.stato]}>{etichettaStato[n.stato]}</Badge>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Azioni
                            riga={n}
                            stagioni={stagioni}
                            stagioneId={stagioneId}
                            listino={listino}
                            puoInvitare={puoInvitare}
                            puoEliminare={puoEliminare}
                          />
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
  puoEliminare,
}: {
  riga: RigaNuovo;
  stagioni: { id: string; nome: string }[];
  stagioneId: string;
  listino: VoceListino[];
  puoInvitare: boolean;
  puoEliminare: boolean;
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

      {puoEliminare && (
        <AzioneBottone
          azione={eliminaOperatore}
          valori={{ userId: riga.id, ritorno: '/admin/nuovi' }}
          icona="elimina"
          conferma={`Eliminare definitivamente ${riga.nome} ${riga.cognome}? L'operazione non è reversibile.`}
          className="btn-danger btn-sm"
        >
          Elimina
        </AzioneBottone>
      )}
    </>
  );
}
