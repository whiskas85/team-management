'use client';

import Link from 'next/link';
import type { Role, StatoOperatore } from '@prisma/client';
import { Avatar, Badge, Elenco, Vuoto } from './ui';
import { ListaFiltrata } from './Filtri';
import { etichettaRuolo, etichettaStato, tonoCertificato, tonoRuolo, tonoStato } from '@/lib/domain';
import { umanizza } from '@/lib/format';

export type RigaOperatore = {
  id: string;
  nome: string;
  cognome: string;
  callsign: string | null;
  email: string;
  telefono: string | null;
  roles: Role[];
  stato: StatoOperatore;
  adesioni: number;
  presenze: number;
  certStato: string | null;
  certScade: string | null;
  ultimoAccesso: string | null;
  daSaldare: number;
};

const RUOLI: Role[] = ['ADMIN', 'AMMINISTRAZIONE', 'SEGRETERIA', 'TL', 'ATLETA'];

export function ElencoOperatori({
  righe,
  mostraCertificato = true,
  statiFiltrabili,
}: {
  righe: RigaOperatore[];
  mostraCertificato?: boolean;
  statiFiltrabili?: StatoOperatore[];
}) {
  return (
    <ListaFiltrata
      elementi={righe}
      segnaposto="Nome, callsign, email o telefono…"
      cerca={(o) => `${o.nome} ${o.cognome} ${o.callsign ?? ''} ${o.email} ${o.telefono ?? ''}`}
      filtri={[
        {
          nome: 'ruolo',
          etichetta: 'Ruolo',
          opzioni: RUOLI.map((r) => ({ valore: r, testo: etichettaRuolo[r] })),
        },
        ...(statiFiltrabili
          ? [
              {
                nome: 'stato',
                etichetta: 'Stato',
                opzioni: statiFiltrabili.map((s) => ({ valore: s, testo: etichettaStato[s] })),
              },
            ]
          : []),
      ]}
      valoreFiltro={(o, nome) => (nome === 'ruolo' ? o.roles : o.stato)}
    >
      {(lista) =>
        lista.length === 0 ? (
          <Vuoto testo="Nessun operatore corrisponde ai filtri." />
        ) : (
          <Elenco
            cards={lista.map((o) => (
              <Link key={o.id} href={`/admin/operatori/${o.id}`} className="card card-hover block">
                <div className="flex items-start gap-3">
                  <Avatar iniziali={`${o.nome[0] ?? ''}${o.cognome[0] ?? ''}`.toUpperCase()} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium">
                      {o.cognome} {o.nome}
                      {o.callsign && <span className="text-nvg"> · {o.callsign}</span>}
                    </h3>
                    <p className="truncate text-xs text-muted">{o.email}</p>
                    <p className="text-xs text-muted num">
                      {o.presenze} presenze su {o.adesioni} adesioni
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                  <Badge tono={tonoStato[o.stato]}>{etichettaStato[o.stato]}</Badge>
                  {o.roles.map((r) => (
                    <Badge key={r} tono={tonoRuolo[r]}>
                      {etichettaRuolo[r]}
                    </Badge>
                  ))}
                  {mostraCertificato &&
                    (o.certStato ? (
                      <Badge tono={tonoCertificato[o.certStato as 'VALIDO']}>
                        Cert. {umanizza(o.certStato)}
                      </Badge>
                    ) : (
                      <Badge tono="danger">Nessun cert.</Badge>
                    ))}
                </div>
              </Link>
            ))}
            tabella={
              <table className="tabella">
                <thead>
                  <tr>
                    <th>Operatore</th>
                    <th>Contatti</th>
                    <th>Ruoli</th>
                    <th>Stato</th>
                    {mostraCertificato && <th>Certificato</th>}
                    <th>Presenze</th>
                    <th>Da saldare</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link
                          href={`/admin/operatori/${o.id}`}
                          className="font-medium hover:text-nvg"
                        >
                          {o.cognome} {o.nome}
                        </Link>
                        {o.callsign && (
                          <span className="block text-[11px] text-nvg">{o.callsign}</span>
                        )}
                      </td>
                      <td className="text-xs text-muted">
                        {o.email}
                        {o.telefono && <span className="block num">{o.telefono}</span>}
                      </td>
                      <td>
                        <span className="flex flex-wrap gap-1">
                          {o.roles.length === 0 ? (
                            <span className="text-xs text-muted">—</span>
                          ) : (
                            o.roles.map((r) => (
                              <Badge key={r} tono={tonoRuolo[r]}>
                                {etichettaRuolo[r]}
                              </Badge>
                            ))
                          )}
                        </span>
                      </td>
                      <td>
                        <Badge tono={tonoStato[o.stato]}>{etichettaStato[o.stato]}</Badge>
                      </td>
                      {mostraCertificato && (
                        <td>
                          {o.certStato ? (
                            <>
                              <Badge tono={tonoCertificato[o.certStato as 'VALIDO']}>
                                {umanizza(o.certStato)}
                              </Badge>
                              {o.certScade && (
                                <span className="mt-1 block text-[11px] text-muted num">
                                  fino al {o.certScade}
                                </span>
                              )}
                            </>
                          ) : (
                            <Badge tono="danger">Assente</Badge>
                          )}
                        </td>
                      )}
                      <td className="text-xs text-muted num">
                        {o.presenze}/{o.adesioni}
                      </td>
                      <td className="whitespace-nowrap num">
                        {o.daSaldare > 0 ? (
                          <span className="text-warn">
                            {o.daSaldare.toLocaleString('it-IT', {
                              style: 'currency',
                              currency: 'EUR',
                            })}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
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
