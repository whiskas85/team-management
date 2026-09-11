'use client';

import Link from 'next/link';
import type { StatoOperatore } from '@prisma/client';
import { Avatar, Badge, Elenco, Vuoto } from './ui';
import { ListaFiltrata } from './Filtri';
import {
  etichettaStato,
  tonoCertificato,
  tonoFigt,
  tonoIscrizione,
  tonoStato,
  type Tono,
} from '@/lib/domain';
import { umanizza } from '@/lib/format';

export type RigaRegolarita = {
  id: string;
  nome: string;
  iniziali: string;
  /** Ha una foto del profilo: senza, l'avatar mostra le iniziali. */
  foto: boolean;
  stato: StatoOperatore;
  /** L’iscrizione della stagione in corso. Nessuna: non è ancora stata mandata. */
  iscrizione: string | null;
  /** Lo stato del certificato che vale davvero oggi, scadenza compresa. */
  certStato: string | null;
  /** Agonistico o no: dove serve l’agonistico, l’altro non basta. */
  certTipo: string | null;
  certScade: string | null;
  /** Valido, ma per poco: chi lo rinnova ha bisogno di saperlo prima. */
  certInScadenza: boolean;
  tessera: string | null;
  /** Iscrizione attiva e certificato valido: è questa la domanda della pagina. */
  aPosto: boolean;
};

const ETICHETTA_CERT: Record<string, string> = {
  VALIDO: 'valido',
  IN_ATTESA: 'da vagliare',
  SCADUTO: 'scaduto',
  RIFIUTATO: 'rifiutato',
};

/**
 * Chi è in regola e chi no, senza nient’altro intorno.
 *
 * È l’elenco degli operatori visto da chi amministra le persone invece di
 * gestirle: niente ruoli da assegnare, niente password da azzerare, niente
 * quote in euro — quelle sono della segreteria. Restano le due domande che in
 * amministrazione si fanno tutti i giorni: **l’iscrizione è a posto?** e **il
 * certificato medico è valido?**. La tessera federale sta a fianco perché è la
 * terza cosa che si guarda nello stesso giro, ma non entra nel verdetto: una
 * tessera si recupera dal portale in un momento, un certificato scaduto no.
 */
export function ElencoRegolarita({ righe }: { righe: RigaRegolarita[] }) {
  const badgeIscrizione = (r: RigaRegolarita) =>
    r.iscrizione === null ? (
      <Badge tono="neutro">nessuna</Badge>
    ) : (
      <Badge tono={tonoIscrizione[r.iscrizione] ?? 'neutro'}>{umanizza(r.iscrizione)}</Badge>
    );

  const badgeCertificato = (r: RigaRegolarita) =>
    r.certStato === null ? (
      <Badge tono="danger">mancante</Badge>
    ) : (
      <span className="flex flex-wrap items-center gap-1.5">
        <Badge tono={(tonoCertificato as Record<string, Tono>)[r.certStato] ?? 'neutro'}>
          {ETICHETTA_CERT[r.certStato] ?? umanizza(r.certStato)}
        </Badge>
        {r.certTipo && (
          <span className="text-[11px] text-muted">
            {r.certTipo === 'AGONISTICO' ? 'agonistico' : 'non agonistico'}
          </span>
        )}
        {r.certScade && (
          <span className={`num text-[11px] ${r.certInScadenza ? 'text-warn' : 'text-muted'}`}>
            {r.certInScadenza ? `scade il ${r.certScade}` : r.certScade}
          </span>
        )}
      </span>
    );

  const badgeTessera = (r: RigaRegolarita) =>
    r.tessera === null ? (
      <Badge tono="neutro">nessuna</Badge>
    ) : (
      <Badge tono={tonoFigt[r.tessera] ?? 'neutro'}>{umanizza(r.tessera)}</Badge>
    );

  const verdetto = (r: RigaRegolarita) =>
    r.aPosto ? <Badge tono="ok">a posto</Badge> : <Badge tono="warn">da sistemare</Badge>;

  return (
    <ListaFiltrata
      elementi={righe}
      cerca={(r) => r.nome}
      segnaposto="Cerca per nome o callsign…"
      filtri={[
        {
          nome: 'situazione',
          etichetta: 'Situazione',
          opzioni: [
            { valore: 'no', testo: 'Da sistemare' },
            { valore: 'si', testo: 'A posto' },
          ],
        },
        {
          nome: 'iscrizione',
          etichetta: 'Iscrizione',
          opzioni: [
            { valore: 'ATTIVA', testo: 'Attiva' },
            { valore: 'COMPILATA', testo: 'Compilata' },
            { valore: 'INVITATA', testo: 'Invitata' },
            { valore: 'SCADUTA', testo: 'Scaduta' },
            { valore: 'nessuna', testo: 'Nessuna' },
          ],
        },
        {
          nome: 'certificato',
          etichetta: 'Certificato',
          opzioni: [
            { valore: 'VALIDO', testo: 'Valido' },
            { valore: 'IN_ATTESA', testo: 'Da vagliare' },
            { valore: 'SCADUTO', testo: 'Scaduto' },
            { valore: 'AGONISTICO', testo: 'Agonistico' },
            { valore: 'mancante', testo: 'Mancante' },
          ],
        },
      ]}
      valoreFiltro={(r, nome) => {
        if (nome === 'situazione') return r.aPosto ? 'si' : 'no';
        if (nome === 'iscrizione') return r.iscrizione ?? 'nessuna';
        // il tipo sta nello stesso filtro dello stato: «agonistico» risponde a
        // «com’è messo il certificato» quanto «scaduto»
        return [r.certStato ?? 'mancante', r.certTipo ?? ''];
      }}
    >
      {(filtrate) =>
        filtrate.length === 0 ? (
          <Vuoto testo="Nessuno con questi filtri." />
        ) : (
          <Elenco
            cards={filtrate.map((r) => (
              <Link key={r.id} href={`/admin/operatori/${r.id}`} className="card block space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar iniziali={r.iniziali} fotoDi={r.foto ? r.id : null} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.nome}</span>
                    <span className="text-[11px] text-muted">{etichettaStato[r.stato]}</span>
                  </span>
                  {verdetto(r)}
                </div>
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  Iscrizione {badgeIscrizione(r)}
                </p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  Certificato {badgeCertificato(r)}
                </p>
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  Tessera {badgeTessera(r)}
                </p>
              </Link>
            ))}
            tabella={
              <table className="tabella">
                <thead>
                  <tr>
                    <th>Operatore</th>
                    <th>Stato</th>
                    <th>Iscrizione</th>
                    <th>Certificato medico</th>
                    <th>Tessera FIGT</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtrate.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link
                          href={`/admin/operatori/${r.id}`}
                          className="font-medium hover:text-nvg"
                        >
                          {r.nome}
                        </Link>
                      </td>
                      <td>
                        <Badge tono={tonoStato[r.stato]}>{etichettaStato[r.stato]}</Badge>
                      </td>
                      <td>{badgeIscrizione(r)}</td>
                      <td>{badgeCertificato(r)}</td>
                      <td>{badgeTessera(r)}</td>
                      <td className="text-right">{verdetto(r)}</td>
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
