'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import type { Role, StatoOperatore } from '@prisma/client';
import { Avatar, Badge, Elenco, Vuoto } from './ui';
import { ListaFiltrata } from './Filtri';
import {
  etichettaRuolo,
  etichettaStato,
  tonoCertificato,
  tonoFigt,
  tonoRuolo,
  tonoStato,
  devePortareCertificato,
} from '@/lib/domain';
import { Icona } from './Icona';
import { umanizza } from '@/lib/format';
import { assegnaRuolo, eliminaOperatore } from '@/actions/operatori';
import { BottoneElimina } from './CardRiga';

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
  /** L'ultima volta che ha **usato** il gestionale, non che ci è entrata. */
  ultimaAttivita: string | null;
  /** Lo stesso istante in millisecondi: la data formattata non si può ordinare. */
  ultimaAttivitaIl: number | null;
  /** La versione del gestionale che ha visto l'ultima volta che è passato. */
  versione: string | null;
  /** Non è quella di adesso: ha in mano un gestionale di qualche rilascio fa. */
  versioneVecchia: boolean;
  daSaldare: number;
  nato: string | null;
  anni: number | null;
  /** La tessera FIGT della stagione in corso, se c'e'. */
  tessera: { status: string; codice: string | null } | null;
  /** Ha acceso le notifiche: gli avvisi gli arrivano sul telefono. */
  avvisi: boolean;
};

/** Le colonne su cui si può ordinare cliccando l'intestazione. */
type Colonna =
  | 'nome'
  | 'stato'
  | 'anni'
  | 'certificato'
  | 'tessera'
  | 'presenze'
  | 'attivita'
  | 'saldo';

const VALORI: Record<Colonna, (o: RigaOperatore) => string | number | null> = {
  nome: (o) => `${o.cognome} ${o.nome}`.toLowerCase(),
  stato: (o) => o.stato,
  anni: (o) => o.anni,
  certificato: (o) => o.certStato ?? null,
  tessera: (o) => o.tessera?.status ?? null,
  presenze: (o) => o.presenze,
  attivita: (o) => o.ultimaAttivitaIl,
  saldo: (o) => o.daSaldare,
};

const RUOLI: Role[] = ['ADMIN', 'AMMINISTRAZIONE', 'SEGRETERIA', 'TL', 'ATLETA'];

export function ElencoOperatori({
  righe,
  mostraCertificato = true,
  statiFiltrabili,
  puoEliminare = false,
  puoAssegnareRuoli = false,
  libro = false,
}: {
  righe: RigaOperatore[];
  /**
   * Il libro atleti: un elenco da leggere, non da amministrare.
   *
   * Ci sono le cose che servono a sapere se un atleta puo' scendere in campo
   * e come raggiungerlo — eta', certificato, tessera, campanella — e mancano
   * quelle che servono a gestirlo: ruoli, stato, spunte, cestino. Stanno in
   * «Tutti», dove la pagina e' fatta per quello.
   */
  libro?: boolean;
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
    <BottoneElimina
      azione={eliminaOperatore}
      valori={{ userId: o.id, ritorno: '/admin/operatori' }}
      conferma={`Eliminare definitivamente ${o.nome} ${o.cognome} e tutti i suoi dati? L'operazione non è reversibile.`}
      etichetta={`Elimina ${o.nome} ${o.cognome}`}
    />
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

  // ------------------------------------------------------ pezzi condivisi
  const certificato = (o: RigaOperatore) =>
    o.certStato ? (
      <>
        <Badge tono={tonoCertificato[o.certStato as 'VALIDO']}>{umanizza(o.certStato)}</Badge>
        {o.certScade && (
          <span className="mt-1 block text-[11px] text-muted num">fino al {o.certScade}</span>
        )}
      </>
    ) : devePortareCertificato(o.roles) ? (
      <Badge tono="danger">Assente</Badge>
    ) : (
      <span className="text-[11px] text-muted">non serve</span>
    );

  const tessera = (o: RigaOperatore) =>
    o.tessera ? (
      <>
        <Badge tono={tonoFigt[o.tessera.status] ?? 'neutro'}>{umanizza(o.tessera.status)}</Badge>
        {o.tessera.codice && (
          <span className="mt-1 block text-[11px] text-muted num">{o.tessera.codice}</span>
        )}
      </>
    ) : (
      // Un atleta senza la tessera della stagione e' un atleta che la
      // federazione non conosce: si dice in chiaro, come per il certificato.
      <Badge tono="warn">Nessuna</Badge>
    );

  // La campanella accesa vuol dire che l'avviso arriva sul telefono; spenta,
  // che partira' un WhatsApp. Non e' un difetto: e' come lo si raggiunge.
  const campanella = (o: RigaOperatore) => (
    <span
      className={o.avvisi ? 'text-nvg' : 'text-muted/40'}
      title={
        o.avvisi ? 'Riceve le notifiche sul telefono' : 'Niente notifiche: lo si avvisa su WhatsApp'
      }
    >
      <Icona nome="avvisi" size={16} />
    </span>
  );

  const saldo = (o: RigaOperatore) =>
    o.daSaldare > 0 ? (
      <span className="text-warn">
        {o.daSaldare.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
      </span>
    ) : (
      <span className="text-muted">—</span>
    );

  /*
   * Quando è passato, e con che versione.
   *
   * La versione sta sotto la data perché è la stessa informazione vista da
   * un'altra parte: chi non apre OPS da tre settimane ha in mano il
   * gestionale di tre settimane fa, e una cosa che «non gli funziona» spesso
   * è solo una cosa che lui non ha ancora.
   */
  const visto = (o: RigaOperatore) =>
    o.ultimaAttivita ? (
      <>
        <span className="text-muted">{o.ultimaAttivita}</span>
        {o.versione && (
          <span className={`block text-[11px] ${o.versioneVecchia ? 'text-warn' : 'text-muted'}`}>
            v{o.versione}
          </span>
        )}
      </>
    ) : (
      <span className="text-warn">mai entrato</span>
    );

  /*
   * Lo stato non ha una colonna, nel libro: quasi tutti sono «in squadra», e
   * scriverlo su ogni riga non dice niente. Chi e' sospeso o da riconfermare
   * invece va visto — scende in campo solo quando torna a posto — e lo dice un
   * segno piccolo sotto il nome.
   */
  const segnoStato = (o: RigaOperatore) =>
    o.stato !== 'SQUADRA' && (
      <span className="mt-0.5 block">
        <Badge tono={tonoStato[o.stato]}>{etichettaStato[o.stato]}</Badge>
      </span>
    );

  if (libro) {
    return (
      <ListaFiltrata
        elementi={righe}
        segnaposto="Nome, callsign, email o telefono…"
        cerca={(o) => `${o.nome} ${o.cognome} ${o.callsign ?? ''} ${o.email} ${o.telefono ?? ''}`}
        filtri={[]}
        valoreFiltro={() => ''}
      >
        {(lista) =>
          lista.length === 0 ? (
            <Vuoto testo="Nessun atleta corrisponde alla ricerca." />
          ) : (
            <Elenco
              cards={ordinati(lista).map((o) => (
                <Link key={o.id} href={`/admin/operatori/${o.id}`} className="card block">
                  <div className="flex items-start gap-3">
                    <Avatar iniziali={`${o.nome[0] ?? ''}${o.cognome[0] ?? ''}`.toUpperCase()} />
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-medium">
                        {o.cognome} {o.nome}
                        {o.callsign && <span className="text-nvg"> · {o.callsign}</span>}
                      </h3>
                      <p className="break-all text-xs text-muted">{o.email}</p>
                      {o.telefono && <p className="text-xs text-muted num">{o.telefono}</p>}
                      <p className="text-xs text-muted num">
                        {o.nato ? `${o.nato} · ${o.anni} anni` : 'data di nascita mancante'}
                      </p>
                      {segnoStato(o)}
                    </div>
                    {campanella(o)}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
                    <div>
                      <p className="label">Certificato</p>
                      {certificato(o)}
                    </div>
                    <div>
                      <p className="label">Tessera FIGT</p>
                      {tessera(o)}
                    </div>
                    <div>
                      <p className="label">Presenze</p>
                      <span className="num">{o.presenze}</span>
                    </div>
                    <div>
                      <p className="label">Da saldare</p>
                      <span className="num">{saldo(o)}</span>
                    </div>
                    <div className="col-span-2 num">{visto(o)}</div>
                  </div>
                </Link>
              ))}
              tabella={
                <table className="tabella">
                  <thead>
                    <tr>
                      <Titolo col="nome">Operatore</Titolo>
                      <th>Contatti</th>
                      <th>Nascita</th>
                      <Titolo col="anni">Anni</Titolo>
                      <Titolo col="certificato">Certificato</Titolo>
                      <Titolo col="tessera">Tessera FIGT</Titolo>
                      <th title="Notifiche sul telefono">Avvisi</th>
                      <Titolo col="presenze">Presenze</Titolo>
                      <Titolo col="attivita">Ultima attività</Titolo>
                      <Titolo col="saldo">Da saldare</Titolo>
                    </tr>
                  </thead>
                  <tbody>
                    {ordinati(lista).map((o) => (
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
                          {segnoStato(o)}
                        </td>
                        <td className="max-w-[13rem] text-xs text-muted">
                          <span className="block truncate" title={o.email}>
                            {o.email}
                          </span>
                          {o.telefono && <span className="block num">{o.telefono}</span>}
                        </td>
                        <td className="whitespace-nowrap text-xs text-muted num">
                          {o.nato ?? '—'}
                        </td>
                        <td className="num">{o.anni ?? <span className="text-muted">—</span>}</td>
                        <td>{certificato(o)}</td>
                        <td>{tessera(o)}</td>
                        <td>{campanella(o)}</td>
                        <td className="num">{o.presenze}</td>
                        <td className="whitespace-nowrap text-xs num">{visto(o)}</td>
                        <td className="whitespace-nowrap num">{saldo(o)}</td>
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
              <div
                key={o.id}
                className={`card relative ${scelti.has(o.id) ? 'border-nvg' : ''}`}
              >
              {/* il cestino in alto a destra, fuori dal link della scheda: un
                  pulsante dentro un link si preme aprendo la scheda */}
              {puoEliminare && <div className="absolute right-3 top-3 z-10">{elimina(o)}</div>}
              {puoAssegnareRuoli && (
                <label className="mb-2 flex items-center gap-2 text-xs text-muted">
                  {spunta(o)} seleziona
                </label>
              )}
              <Link href={`/admin/operatori/${o.id}`} className="block">
                <div className={`flex items-start gap-3 ${puoEliminare ? 'pr-10' : ''}`}>
                  <Avatar iniziali={`${o.nome[0] ?? ''}${o.cognome[0] ?? ''}`.toUpperCase()} />
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-medium">
                      {o.cognome} {o.nome}
                      {o.callsign && <span className="text-nvg"> · {o.callsign}</span>}
                    </h3>
                    <p className="break-all text-xs text-muted">{o.email}</p>
                    <p className="text-xs text-muted num">
                      {o.presenze} presenze su {o.adesioni} adesioni
                    </p>
                    <p className="text-xs num">
                      {o.ultimaAttivita ? (
                        <>
                          <span className="text-muted">visto {o.ultimaAttivita}</span>
                          {o.versione && (
                            <span className={o.versioneVecchia ? 'text-warn' : 'text-muted'}>
                              {' '}
                              · v{o.versione}
                            </span>
                          )}
                        </>
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
                      // a chi non è atleta il certificato non si chiede: il
                      // badge rosso gli segnerebbe una mancanza che non ha
                      devePortareCertificato(o.roles) && <Badge tono="danger">Nessun cert.</Badge>
                    ))}
                </div>
              </Link>
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
                    <Titolo col="attivita">Ultima attività</Titolo>
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
                          ) : devePortareCertificato(o.roles) ? (
                            <Badge tono="danger">Assente</Badge>
                          ) : (
                            <span className="text-[11px] text-muted">non serve</span>
                          )}
                        </td>
                      )}
                      <td className="text-xs text-muted num">
                        {o.presenze}/{o.adesioni}
                      </td>
                      <td className="whitespace-nowrap text-xs num">
                        {o.ultimaAttivita ? (
                          <>
                            <span className="text-muted">{o.ultimaAttivita}</span>
                            {o.versione && (
                              <span
                                className={`block text-[11px] ${
                                  o.versioneVecchia ? 'text-warn' : 'text-muted'
                                }`}
                              >
                                v{o.versione}
                              </span>
                            )}
                          </>
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
