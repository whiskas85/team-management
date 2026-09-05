'use client';

import { useState } from 'react';
import { Avatar, Badge, Campo, Elenco, Vuoto } from './ui';
import { ListaFiltrata } from './Filtri';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { CampiRichiesta, type VoceListino } from './CampiRichiesta';
import { etichettaStato, tonoStato } from '@/lib/domain';
import { inviaRichiesteMultiple } from '@/actions/iscrizioni';
import type { StatoOperatore } from '@prisma/client';

export type Candidato = {
  id: string;
  nome: string;
  cognome: string;
  callsign: string | null;
  email: string;
  telefono: string | null;
  stato: StatoOperatore;
  /** VECCHIO = era tesserato la stagione scorsa, NUOVO = primo tesseramento. */
  origine: 'VECCHIO' | 'NUOVO';
  ultimaStagione: string | null;
  presenze: number;
  giaInvitato: boolean;
};

export function InvioRichieste({
  candidati,
  stagioni,
  stagioneId,
  stagionePrecedente,
  listino,
}: {
  candidati: Candidato[];
  stagioni: { id: string; nome: string }[];
  stagioneId: string;
  stagionePrecedente: string | null;
  /** Voci di listino valide per la stagione scelta. */
  listino: VoceListino[];
}) {
  const [scelti, setScelti] = useState<Set<string>>(new Set());

  const commuta = (id: string) =>
    setScelti((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selezionabili = candidati.filter((c) => !c.giaInvitato);
  const tuttiScelti = selezionabili.length > 0 && selezionabili.every((c) => scelti.has(c.id));

  return (
    <FormAzione azione={inviaRichiesteMultiple} className="space-y-5">
      {[...scelti].map((id) => (
        <input key={id} type="hidden" name="userIds" value={id} />
      ))}

      {/* ------------------------------------------------ parametri dell'invio */}
      <div className="card">
        <p className="titolo-sezione mb-4">Cosa stai inviando</p>

        <CampiRichiesta
          stagioni={stagioni}
          stagioneId={stagioneId}
          listino={listino}
          azione={
            <Invia className="btn-primary w-full">
              Invia a {scelti.size} {scelti.size === 1 ? 'operatore' : 'operatori'}
            </Invia>
          }
        />

        <div className="mt-4">
          <Campo label="Messaggio" span>
            <textarea
              name="messaggio"
              rows={2}
              className="input"
              placeholder="Testo che leggeranno prima di compilare il moduloâ¦"
            />
          </Campo>
        </div>

        <p className="mt-2 text-xs text-muted">
          Chi riceve la richiesta passa in âattesa compilazioneâ e trova il modulo nella sua
          pagina personale.
        </p>
      </div>

      {/* ------------------------------------------------ destinatari */}
      <ListaFiltrata
        elementi={candidati}
        segnaposto="Nome, callsign o email…"
        cerca={(c) => `${c.nome} ${c.cognome} ${c.callsign ?? ''} ${c.email}`}
        filtri={[
          {
            nome: 'origine',
            etichetta: 'Provenienza',
            opzioni: [
              {
                valore: 'VECCHIO',
                testo: stagionePrecedente
                  ? `Già tesserati ${stagionePrecedente}`
                  : 'Già tesserati in passato',
              },
              { valore: 'NUOVO', testo: 'Nuovi contatti' },
            ],
          },
        ]}
        valoreFiltro={(c) => c.origine}
      >
        {(lista) => (
          <>
            <div className="mb-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setScelti(
                    tuttiScelti
                      ? new Set()
                      : new Set(lista.filter((c) => !c.giaInvitato).map((c) => c.id)),
                  )
                }
                className="btn-ghost btn-sm"
              >
                {tuttiScelti ? 'Deseleziona tutti' : 'Seleziona tutti i visibili'}
              </button>
              {scelti.size > 0 && (
                <span className="text-xs text-nvg num">{scelti.size} selezionati</span>
              )}
            </div>

            {lista.length === 0 ? (
              <Vuoto testo="Nessun operatore corrisponde ai filtri." />
            ) : (
              <Elenco
                cards={lista.map((c) => (
                  <label
                    key={c.id}
                    className={`card flex items-start gap-3 ${
                      c.giaInvitato ? 'opacity-50' : 'cursor-pointer'
                    } ${scelti.has(c.id) ? 'border-nvg/50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      disabled={c.giaInvitato}
                      checked={scelti.has(c.id)}
                      onChange={() => commuta(c.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
                    />
                    <Avatar iniziali={`${c.nome[0] ?? ''}${c.cognome[0] ?? ''}`.toUpperCase()} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {c.cognome} {c.nome}
                      </p>
                      <p className="truncate text-xs text-muted">{c.email}</p>
                      <p className="mt-1 flex flex-wrap gap-1.5">
                        <Badge tono={c.origine === 'VECCHIO' ? 'ok' : 'info'}>
                          {c.origine === 'VECCHIO' ? `Tesserato ${c.ultimaStagione}` : 'Nuovo'}
                        </Badge>
                        {c.giaInvitato && <Badge tono="warn">Già invitato</Badge>}
                      </p>
                    </div>
                  </label>
                ))}
                tabella={
                  <table className="tabella">
                    <thead>
                      <tr>
                        <th className="w-10"></th>
                        <th>Operatore</th>
                        <th>Recapiti</th>
                        <th>Provenienza</th>
                        <th>Stato</th>
                        <th>Presenze</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((c) => (
                        <tr key={c.id} className={c.giaInvitato ? 'opacity-50' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              disabled={c.giaInvitato}
                              checked={scelti.has(c.id)}
                              onChange={() => commuta(c.id)}
                              className="h-4 w-4 accent-[color:var(--nvg)]"
                            />
                          </td>
                          <td className="font-medium">
                            {c.cognome} {c.nome}
                            {c.callsign && (
                              <span className="block text-[11px] text-nvg">{c.callsign}</span>
                            )}
                          </td>
                          <td className="text-xs text-muted">
                            {c.email}
                            {c.telefono && <span className="block num">{c.telefono}</span>}
                          </td>
                          <td>
                            <Badge tono={c.origine === 'VECCHIO' ? 'ok' : 'info'}>
                              {c.origine === 'VECCHIO'
                                ? `Tesserato ${c.ultimaStagione}`
                                : 'Nuovo contatto'}
                            </Badge>
                          </td>
                          <td>
                            {c.giaInvitato ? (
                              <Badge tono="warn">Già invitato</Badge>
                            ) : (
                              <Badge tono={tonoStato[c.stato]}>{etichettaStato[c.stato]}</Badge>
                            )}
                          </td>
                          <td className="text-muted num">{c.presenze}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
              />
            )}
          </>
        )}
      </ListaFiltrata>
    </FormAzione>
  );
}
