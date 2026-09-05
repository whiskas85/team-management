import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { elencoOperatori } from '@/lib/query';
import { fmtDate, inputDate } from '@/lib/format';
import { Badge, Campo, Elenco, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { RosaStorica } from '@/components/RosaStorica';
import { Invia } from '@/components/Bottone';
import { apriStagione, chiudiStagione, eliminaStagione, salvaStagione } from '@/actions/stagioni';

type Stagione = {
  id: string;
  nome: string;
  inizio: Date;
  fine: Date;
  corrente: boolean;
  chiusa: boolean;
  note: string | null;
};

type Operatore = { id: string; nome: string; cognome: string; callsign: string | null };

/**
 * Come si chiama lo stato di una stagione. "Programmata" ha senso solo per una
 * che deve ancora cominciare: una gia' finita e mai chiusa e' passata, non
 * futura, e va segnalata perche' aspetta una chiusura.
 */
function statoStagione(s: Stagione, ora: Date) {
  if (s.corrente) return { testo: 'In corso', tono: 'ok' as const };
  if (s.chiusa) return { testo: 'Chiusa', tono: 'neutro' as const };
  if (s.fine < ora) return { testo: 'Da chiudere', tono: 'warn' as const };
  return { testo: 'Programmata', tono: 'info' as const };
}

export default async function StagioniPage() {
  await requirePermesso(isAdmin);
  const ora = new Date();

  const [stagioni, operatori, inRosa, daRiconfermare] = await Promise.all([
    prisma.stagione.findMany({
      orderBy: { inizio: 'desc' },
      include: { _count: { select: { memberships: true, figtCards: true, eventi: true } } },
    }),
    elencoOperatori(false),
    prisma.user.count({ where: { stato: 'SQUADRA' } }),
    prisma.user.count({ where: { stato: 'DA_RICONFERMARE' } }),
  ]);

  const corrente = stagioni.find((s) => s.corrente);
  const daChiudere = stagioni.filter((s) => !s.corrente && !s.chiusa && s.fine < ora).length;

  return (
    <>
      <Intestazione
        titolo="Stagioni"
        sottotitolo="L&rsquo;anno sportivo: dentro ci stanno iscrizioni, tessere e attivit&agrave;"
        azioni={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/tariffe" className="btn-ghost btn-sm">
              Tariffario &rarr;
            </Link>
            <BottoneModale etichetta="Nuova stagione" icona="aggiungi" titolo="Nuova stagione">
              <FormAzione azione={salvaStagione}>
                <CampiStagione />
                <Invia icona="salva">Crea</Invia>
              </FormAzione>
            </BottoneModale>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica
          etichetta="Stagione in corso"
          valore={corrente?.nome ?? 'Nessuna'}
          dettaglio={
            corrente ? `${fmtDate(corrente.inizio)} - ${fmtDate(corrente.fine)}` : undefined
          }
          tono={corrente ? 'ok' : 'warn'}
        />
        <Statistica etichetta="In squadra" valore={inRosa} dettaglio="rosa attuale" tono="ok" />
        <Statistica
          etichetta="Da riconfermare"
          valore={daRiconfermare}
          dettaglio="aspettano il reinvito"
          tono={daRiconfermare > 0 ? 'warn' : 'neutro'}
        />
        <Statistica
          etichetta="Anni da chiudere"
          valore={daChiudere}
          dettaglio="finiti ma ancora aperti"
          tono={daChiudere > 0 ? 'warn' : 'ok'}
        />
      </div>

      {stagioni.length === 0 ? (
        <Vuoto testo="Nessuna stagione registrata. Creane una per cominciare." />
      ) : (
        <Elenco
          cards={stagioni.map((s) => {
            const stato = statoStagione(s, ora);
            return (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium">
                      <Link href={`/admin/stagioni/${s.id}`} className="hover:text-nvg">
                        {s.nome}
                      </Link>
                    </h3>
                    <p className="num text-xs text-muted">
                      {fmtDate(s.inizio)} - {fmtDate(s.fine)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {s._count.memberships} iscrizioni &middot; {s._count.figtCards} tessere
                      &middot; {s._count.eventi} attivit&agrave;
                    </p>
                  </div>
                  <Badge tono={stato.tono}>{stato.testo}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  <Azioni stagione={s} operatori={operatori} />
                </div>
              </div>
            );
          })}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Stagione</th>
                  <th>Periodo</th>
                  <th>Iscrizioni</th>
                  <th>Tessere</th>
                  <th>Attivit&agrave;</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {stagioni.map((s) => {
                  const stato = statoStagione(s, ora);
                  return (
                    <tr key={s.id} className={s.chiusa ? 'opacity-60' : ''}>
                      <td>
                        <Link
                          href={`/admin/stagioni/${s.id}`}
                          className="font-medium hover:text-nvg"
                        >
                          {s.nome}
                        </Link>
                      </td>
                      <td className="num whitespace-nowrap text-muted">
                        {fmtDate(s.inizio)} - {fmtDate(s.fine)}
                      </td>
                      <td className="num text-muted">{s._count.memberships}</td>
                      <td className="num text-muted">{s._count.figtCards}</td>
                      <td className="num text-muted">{s._count.eventi}</td>
                      <td>
                        <Badge tono={stato.tono}>{stato.testo}</Badge>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          <Azioni stagione={s} operatori={operatori} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          }
        />
      )}
    </>
  );
}

function Azioni({ stagione, operatori }: { stagione: Stagione; operatori: Operatore[] }) {
  return (
    <>
      {!stagione.corrente && (
        <BottoneModale
          etichetta="Apri"
          icona="rilascia"
          titolo={`Apri la stagione ${stagione.nome}`}
          className="btn-primary btn-sm"
        >
          <FormAzione azione={apriStagione}>
            <input type="hidden" name="id" value={stagione.id} />
            <p className="mb-4 text-sm text-muted">
              {stagione.nome} diventa la stagione in corso: iscrizioni, tessere e nuove
              attivit&agrave; nasceranno dentro di lei.
            </p>
            <label className="mb-4 flex min-w-0 items-start gap-2 rounded-md border border-warn/40 bg-warn/10 p-3 text-sm">
              <input
                type="checkbox"
                name="azzera"
                value="1"
                defaultChecked
                className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
              />
              <span className="min-w-0 text-warn">
                Azzera la rosa
                <span className="block text-[11px]">
                  Chi &egrave; in squadra passa in &ldquo;da riconfermare&rdquo; e rientra solo con
                  una nuova richiesta di reiscrizione. &Egrave; il modo normale di ricominciare
                  l&rsquo;anno: togli la spunta solo se stai correggendo un errore.
                </span>
              </span>
            </label>
            <Invia icona="rilascia">Apri la stagione</Invia>
          </FormAzione>
        </BottoneModale>
      )}

      <BottoneModale
        etichetta="Rosa"
        icona="operatori"
        titolo={`Chi c'era nella stagione ${stagione.nome}`}
        className="btn-ghost btn-sm"
        larga
      >
        <RosaStorica stagioneId={stagione.id} nome={stagione.nome} operatori={operatori} />
      </BottoneModale>

      {!stagione.corrente && (
        <AzioneBottone
          azione={chiudiStagione}
          valori={{ id: stagione.id }}
          icona={stagione.chiusa ? 'rilascia' : 'concludi'}
          className="btn-ghost btn-sm"
        >
          {stagione.chiusa ? 'Riapri' : 'Chiudi'}
        </AzioneBottone>
      )}

      <BottoneModale
        etichetta="Modifica"
        icona="modifica"
        titolo={`Modifica ${stagione.nome}`}
        className="btn-ghost btn-sm"
      >
        <FormAzione azione={salvaStagione}>
          <input type="hidden" name="id" value={stagione.id} />
          <CampiStagione stagione={stagione} />
          <Invia icona="salva">Salva</Invia>
        </FormAzione>
      </BottoneModale>

      {!stagione.corrente && (
        <AzioneBottone
          azione={eliminaStagione}
          valori={{ id: stagione.id }}
          icona="elimina"
          conferma={`Eliminare la stagione ${stagione.nome}? Se ha iscrizioni o attivita verra solo chiusa.`}
          className="btn-danger btn-sm"
        >
          Elimina
        </AzioneBottone>
      )}
    </>
  );
}

function CampiStagione({ stagione }: { stagione?: Stagione }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Nome *">
        <input
          name="nome"
          required
          defaultValue={stagione?.nome}
          className="input"
          placeholder="es. 2026/2027"
        />
      </Campo>
      <Campo label="Inizio *">
        <input
          type="date"
          name="inizio"
          required
          defaultValue={inputDate(stagione?.inizio)}
          className="input"
        />
      </Campo>
      <Campo label="Fine *">
        <input
          type="date"
          name="fine"
          required
          defaultValue={inputDate(stagione?.fine)}
          className="input"
        />
      </Campo>
      <Campo label="Note" span>
        <textarea name="note" rows={2} defaultValue={stagione?.note ?? ''} className="input" />
      </Campo>
    </div>
  );
}
