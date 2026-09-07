'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import type { Role, StatoOperatore } from '@prisma/client';
import { Avatar, Badge, Elenco, Vuoto } from './ui';
import { ListaFiltrata } from './Filtri';
import { etichettaRuolo, etichettaStato, tonoCertificato, tonoRuolo, tonoStato } from '@/lib/domain';
import { umanizza } from '@/lib/format';
import { AzioneBottone } from './AzioneBottone';
import { assegnaRuolo, eliminaOperatore } from '@/actions/operatori';

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
  /** Lo stesso istante in millisecondi: la data formattata non si può ordinare. */
  ultimoAccessoIl: number | null;
  daSaldare: number;
};

/** Le colonne su cui si può ordinare cliccando l'intestazione. */
type Colonna = 'nome' | 'stato' | 'certificato' | 'presenze' | 'accesso' | 'saldo';

const VALORI: Record<Colonna, (o: RigaOperatore) => string | number | null> = {
  nome: (o) => `${o.cognome} ${o.nome}`.toLowerCase(),
  stato: (o) => o.stato,
  certificato: (o) => o.certStato ?? null,
  presenze: (o) => o.presenze,
  accesso: (o) => o.ultimoAccessoIl,
  saldo: (o) => o.daSaldare,
};

const RUOLI: Role[] = ['ADMIN', 'AMMINISTRAZIONE', 'SEGRETERIA', 'TL', 'ATLETA'];

export function ElencoOperatori({
  righe,
  mostraCertificato = true,
  statiFiltrabili,
  puoEliminare = false,
  puoAssegnareRuoli = false,
}: {
  righe: RigaOperatore[];
  mostraCertificato?: boolean;
  statiFiltrabili?: StatoOperatore[];
  /** L'admin cancella dalla riga: prima bisognava aprire la scheda e cercarlo. */
  puoEliminare?: boolean;
  /** Selezione multipla e assegnazione dei ruoli in blocco. */
  puoAssegnareRuoli?: boolean;
}) {
  const [scelti, setScelti] = useState<Set<string>>(new Set());
  const [ruolo, setRuolo] = useState<Role>('ATLETA');
  // di partenza l'ordine è quello che arriva dal server: per cognome
  const [ordine, setOrdine] = useState<{ col: Colonna; giu: boolean }>({
    col: 'nome',
    giu: false,
  });

  /**
   * Ordina la lista già filtrata.
   *
   * Chi non ha il dato — mai entrato, nessun certificato — finisce sempre in
   * fondo, in un verso e nell'altro: sono le righe di cui non si sa niente, e
   * metterle in cima solo perché "vuoto viene prima" sposterebbe l'attenzione
   * sulle persone sbagliate.
   */
  const ordinati = (lista: RigaOperatore[]) => {
    const leggi = VALORI[ordine.col];
    return [...lista].sort((a, b) => {
      const x = leggi(a);
      const y = leggi(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'it');
      return ordine.giu ? -c : c;
    });
  };

  const commutaOrdine = (col: Colonna) =>
    setOrdine((o) => ({ col, giu: o.col === col ? !o.giu : col !== 'nome' }));

  /** Intestazione cliccabile: la freccia dice su quale colonna si sta ordinando. */
  const Titolo = ({ col, children }: { col: Colonna; children: React.ReactNode }) => (
    <th>
      <button
        type="button"
        onClick={() => commutaOrdine(col)}
        className={`flex items-center gap-1 whitespace-nowrap hover:text-ink ${
          ordine.col === col ? 'text-nvg' : ''
        }`}
        title="Ordina per questa colonna"
      >
        {children}
        <span className="text-[9px] opacity-70">
          {ordine.col === col ? (ordine.giu ? '▼' : '▲') : '↕'}
        </span>
      </button>
    </th>
  );
  const [esito, setEsito] = useState<{ ok?: string; errore?: string }>({});
  const [inCorso, avvia] = useTransition();

  // la selezione resta dopo ogni assegnazione: si danno più ruoli alle stesse
  // persone senza rifare la spunta. Si svuota con Esc o con il pulsante
  useEffect(() => {
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setScelti(new Set());
        setEsito({});
      }
    };
    window.addEventListener('keydown', tasto);
    return () => window.removeEventListener('keydown', tasto);
  }, []);

  const commuta = (id: string) =>
    setScelti((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const applica = (ruolo: Role, togli: boolean) =>
    avvia(async () => {
      setEsito({});
      setEsito(await assegnaRuolo([...scelti], ruolo, togli));
    });

  const spunta = (o: RigaOperatore) => (
    <input
      type="checkbox"
      checked={scelti.has(o.id)}
      onChange={() => commuta(o.id)}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
      aria-label={`Seleziona ${o.nome} ${o.cognome}`}
    />
  );
  const elimina = (o: RigaOperatore) => (
    <AzioneBottone
      azione={eliminaOperatore}
      valori={{ userId: o.id, ritorno: '/admin/operatori' }}
      icona="elimina"
      conferma={`Eliminare definitivamente ${o.nome} ${o.cognome} e tutti i suoi dati? L'operazione non è reversibile.`}
      className="btn-danger btn-sm"
    >
      Elimina
    </AzioneBottone>
  );
  // Sta in fondo alla riga dei filtri, non in una colonna a fianco: lì non
  // toglie larghezza alla tabella, che ne ha bisogno tutta, e si vede sempre —
  // una funzione che appare solo dopo aver spuntato qualcuno non si scopre mai.
  //
  // Ogni pezzo ha una larghezza fissa e c'è sempre, acceso o spento: se il
  // riquadro cambiasse misura selezionando una riga, si muoverebbe anche il
  // campo di ricerca accanto, e niente è più fastidioso di una pagina che balla
  // sotto le mani.
  const barra = (
    <div className="flex shrink-0 flex-wrap items-end gap-2">
      <div>
        <label className="label" htmlFor="ruolo-blocco">
          Ruoli in blocco
        </label>
        <select
          id="ruolo-blocco"
          value={ruolo}
          onChange={(e) => setRuolo(e.target.value as Role)}
          className="input w-40"
        >
          {RUOLI.map((r) => (
            <option key={r} value={r}>
              {etichettaRuolo[r]}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={scelti.size === 0 || inCorso}
        onClick={() => applica(ruolo, false)}
        className="btn-ghost btn-sm"
        title="Dai il ruolo agli operatori selezionati"
      >
        Assegna
      </button>
      <button
        type="button"
        disabled={scelti.size === 0 || inCorso}
        onClick={() => applica(ruolo, true)}
        className="btn-ghost btn-sm"
        title="Togli il ruolo agli operatori selezionati"
      >
        Togli
      </button>
      <button
        type="button"
        disabled={scelti.size === 0}
        onClick={() => {
          setScelti(new Set());
          setEsito({});
        }}
        className="btn-ghost btn-sm"
        title="Toglie la spunta a tutti (anche con Esc)"
      >
        Deseleziona
      </button>

      {/* riquadro di larghezza fissa: il testo cambia, l'ingombro no */}
      <span className="w-40 shrink-0 truncate pb-2 text-xs text-muted" title={esito.errore ?? esito.ok ?? ''}>
        {inCorso ? (
          <span className="text-nvg">applico…</span>
        ) : esito.errore ? (
          <span className="text-danger">{esito.errore}</span>
        ) : esito.ok ? (
          <span className="text-nvg">{esito.ok}</span>
        ) : scelti.size === 0 ? (
          'nessuno selezionato'
        ) : (
          <>
            <strong className="num text-nvg">{scelti.size}</strong>{' '}
            {scelti.size === 1 ? 'selezionato' : 'selezionati'}
          </>
        )}
      </span>
    </div>
  );

  const lista = (
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
      azioni={puoAssegnareRuoli ? barra : undefined}
    >
      {(lista) =>
        lista.length === 0 ? (
          <Vuoto testo="Nessun operatore corrisponde ai filtri." />
        ) : (
          <Elenco
            cards={ordinati(lista).map((o) => (
              <div key={o.id} className={`card ${scelti.has(o.id) ? 'border-nvg' : ''}`}>
              {puoAssegnareRuoli && (
                <label className="mb-2 flex items-center gap-2 text-xs text-muted">
                  {spunta(o)} seleziona
                </label>
              )}
              <Link href={`/admin/operatori/${o.id}`} className="block">
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
                    <p className="text-xs num">
                      {o.ultimoAccesso ? (
                        <span className="text-muted">ultimo accesso {o.ultimoAccesso}</span>
                      ) : (
                        <span className="text-warn">mai entrato</span>
                      )}
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
              {puoEliminare && (
                <div className="mt-3 border-t border-line pt-3">{elimina(o)}</div>
              )}
              </div>
            ))}
            tabella={
              <table className="tabella">
                <thead>
                  <tr>
                    {puoAssegnareRuoli && <th className="w-8"></th>}
                    <Titolo col="nome">Operatore</Titolo>
                    <th>Contatti</th>
                    <th>Ruoli</th>
                    <Titolo col="stato">Stato</Titolo>
                    {mostraCertificato && <Titolo col="certificato">Certificato</Titolo>}
                    <Titolo col="presenze">Presenze</Titolo>
                    <Titolo col="accesso">Ultimo accesso</Titolo>
                    <Titolo col="saldo">Da saldare</Titolo>
                    {puoEliminare && <th>Azioni</th>}
                  </tr>
                </thead>
                <tbody>
                  {ordinati(lista).map((o) => (
                    <tr key={o.id} className={scelti.has(o.id) ? 'bg-nvg/5' : ''}>
                      {puoAssegnareRuoli && <td>{spunta(o)}</td>}
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
                      <td className="max-w-[13rem] text-xs text-muted">
                        <span className="block truncate" title={o.email}>
                          {o.email}
                        </span>
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
                      <td className="whitespace-nowrap text-xs num">
                        {o.ultimoAccesso ? (
                          <span className="text-muted">{o.ultimoAccesso}</span>
                        ) : (
                          <span className="text-warn">mai entrato</span>
                        )}
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
                      {puoEliminare && <td className="whitespace-nowrap">{elimina(o)}</td>}
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

  return lista;
}
