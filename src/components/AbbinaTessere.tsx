'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { collegaTessera } from '@/actions/figt';

export type TesseraOrfana = {
  numero: string;
  nominativo: string;
  email: string | null;
  comune: string | null;
  anno: number;
  stato: string;
};

export type OperatoreLibero = {
  id: string;
  nome: string;
  cognome: string;
  callsign: string | null;
  email: string;
};

/**
 * Abbinamento tessere ↔ operatori a due colonne.
 *
 * Si può trascinare una tessera sull'operatore, ma il gesto vero è il doppio
 * tocco: si sceglie la tessera, si sceglie la persona. Funziona anche sul
 * telefono, dove trascinare non funziona quasi mai, e resta chiaro cosa sta
 * per succedere prima che succeda.
 */
export function AbbinaTessere({
  tessere,
  operatori,
}: {
  tessere: TesseraOrfana[];
  operatori: OperatoreLibero[];
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();

  const [scelta, setScelta] = useState<string | null>(null);
  const [sopra, setSopra] = useState<string | null>(null);
  const [esito, setEsito] = useState<{ ok?: string; errore?: string } | null>(null);
  const [qT, setQT] = useState('');
  const [qO, setQO] = useState('');

  // entrambe le colonne in ordine di cognome: il portale scrive "COGNOME NOME",
  // quindi per le tessere basta il nominativo così com'è
  const tessereOrdinate = useMemo(() => {
    const testo = qT.trim().toLowerCase();
    return [...tessere]
      .filter((t) =>
        !testo ? true : `${t.nominativo} ${t.numero} ${t.email ?? ''}`.toLowerCase().includes(testo),
      )
      .sort((a, b) => a.nominativo.localeCompare(b.nominativo, 'it'));
  }, [tessere, qT]);

  const operatoriOrdinati = useMemo(() => {
    const testo = qO.trim().toLowerCase();
    return [...operatori]
      .filter((o) =>
        !testo
          ? true
          : `${o.cognome} ${o.nome} ${o.callsign ?? ''} ${o.email}`.toLowerCase().includes(testo),
      )
      .sort(
        (a, b) =>
          a.cognome.localeCompare(b.cognome, 'it') || a.nome.localeCompare(b.nome, 'it'),
      );
  }, [operatori, qO]);

  const abbina = (numero: string, userId: string) => {
    setScelta(null);
    setSopra(null);
    avvia(async () => {
      const r = await collegaTessera(numero, userId);
      setEsito(r);
      router.refresh();
    });
  };

  const tesseraScelta = tessere.find((t) => t.numero === scelta);

  return (
    <div className="space-y-3">
      {esito?.ok && (
        <p className="rounded-md border border-nvg/40 bg-nvg/10 px-3 py-2 text-sm text-nvg">
          Associata: {esito.ok}
        </p>
      )}
      {esito?.errore && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {esito.errore}
        </p>
      )}

      <p className="text-xs text-muted">
        {tesseraScelta ? (
          <>
            <strong className="text-nvg">{tesseraScelta.nominativo}</strong> è in mano: tocca
            l’operatore a cui darla, oppure{' '}
            <button type="button" onClick={() => setScelta(null)} className="underline">
              lasciala
            </button>
            .
          </>
        ) : (
          <>
            Tocca una tessera e poi la persona. Col mouse si può anche trascinare la tessera
            sull’operatore.
          </>
        )}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ------------------------------------------------------- tessere */}
        <div className="rounded-lg border border-line bg-surface p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warn">
              Tessere senza operatore · {tessereOrdinate.length}
            </p>
          </div>
          <input
            value={qT}
            onChange={(e) => setQT(e.target.value)}
            className="input mb-2"
            placeholder="Cerca nome o numero…"
            autoComplete="off"
          />
          <div className="max-h-[28rem] space-y-1.5 overflow-y-auto">
            {tessereOrdinate.map((t) => {
              const attiva = scelta === t.numero;
              return (
                <button
                  key={t.numero}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    setScelta(t.numero);
                    e.dataTransfer.setData('text/plain', t.numero);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => setSopra(null)}
                  onClick={() => setScelta(attiva ? null : t.numero)}
                  disabled={inCorso}
                  className={`block w-full cursor-grab rounded-md border px-3 py-2 text-left transition-colors active:cursor-grabbing ${
                    attiva
                      ? 'border-nvg bg-nvg/15'
                      : 'border-line bg-surface2 hover:border-nvgdim'
                  }`}
                >
                  <span className="block truncate text-sm font-medium">{t.nominativo}</span>
                  <span className="num block truncate text-[11px] text-muted">
                    {t.numero} · {t.anno} · {t.stato}
                    {t.comune ? ` · ${t.comune}` : ''}
                  </span>
                  {t.email && (
                    <span className="block truncate text-[11px] text-muted">{t.email}</span>
                  )}
                </button>
              );
            })}
            {tessereOrdinate.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">
                {tessere.length === 0 ? 'Tutte associate.' : 'Nessuna corrisponde.'}
              </p>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------- operatori */}
        <div className="rounded-lg border border-line bg-surface p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-nvg">
            Operatori senza tessera · {operatoriOrdinati.length}
          </p>
          <input
            value={qO}
            onChange={(e) => setQO(e.target.value)}
            className="input mb-2"
            placeholder="Cerca cognome o callsign…"
            autoComplete="off"
          />
          <div className="max-h-[28rem] space-y-1.5 overflow-y-auto">
            {operatoriOrdinati.map((o) => {
              const bersaglio = sopra === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setSopra(o.id);
                  }}
                  onDragLeave={() => setSopra((s) => (s === o.id ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const numero = e.dataTransfer.getData('text/plain') || scelta;
                    if (numero) abbina(numero, o.id);
                  }}
                  onClick={() => scelta && abbina(scelta, o.id)}
                  disabled={inCorso || !scelta}
                  className={`block w-full rounded-md border px-3 py-2 text-left transition-colors ${
                    bersaglio
                      ? 'border-nvg bg-nvg/20'
                      : scelta
                        ? 'border-nvgdim bg-surface2 hover:border-nvg hover:bg-nvg/10'
                        : 'border-line bg-surface2 opacity-70'
                  }`}
                >
                  <span className="block truncate text-sm font-medium">
                    {o.cognome} {o.nome}
                    {o.callsign && <span className="text-nvg"> · {o.callsign}</span>}
                  </span>
                  <span className="block truncate text-[11px] text-muted">{o.email}</span>
                </button>
              );
            })}
            {operatoriOrdinati.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">
                {operatori.length === 0
                  ? 'Hanno tutti una tessera.'
                  : 'Nessuno corrisponde.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
