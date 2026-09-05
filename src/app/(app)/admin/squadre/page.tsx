import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { Badge, Campo, Elenco, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { AzioniContatto } from '@/components/AzioniContatto';
import { Invia } from '@/components/Bottone';
import { eliminaSquadra, salvaSquadra } from '@/actions/squadre';

type Squadra = {
  id: string;
  nome: string;
  referente: string | null;
  telefono: string | null;
  email: string | null;
  sito: string | null;
  citta: string | null;
  provincia: string | null;
  note: string | null;
  attiva: boolean;
};

export default async function SquadrePage() {
  await requirePermesso(isAdmin);

  const squadre = await prisma.squadraEsterna.findMany({
    orderBy: [{ attiva: 'desc' }, { nome: 'asc' }],
    include: { campi: { select: { id: true, nome: true } } },
  });

  return (
    <>
      <Intestazione
        titolo="Squadre esterne"
        sottotitolo="Dati di base: gli altri team, chi gestisce i campi e con chi si gioca"
        azioni={
          <BottoneModale etichetta="Aggiungi squadra" icona="aggiungi" titolo="Nuova squadra" larga>
            <FormAzione azione={salvaSquadra}>
              <CampiSquadra />
              <Invia icona="salva">Aggiungi</Invia>
            </FormAzione>
          </BottoneModale>
        }
      />

      {squadre.length === 0 ? (
        <Vuoto testo="Nessuna squadra esterna registrata." />
      ) : (
        <Elenco
          cards={squadre.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium">{s.nome}</h3>
                  <p className="text-xs text-muted">
                    {[s.citta, s.provincia].filter(Boolean).join(' · ') || 'Località non indicata'}
                  </p>
                  {s.referente && <p className="text-xs text-muted">Referente: {s.referente}</p>}
                  {s.campi.length > 0 && (
                    <p className="mt-1 text-xs text-muted">
                      Campi: {s.campi.map((c) => c.nome).join(', ')}
                    </p>
                  )}
                </div>
                {!s.attiva && <Badge tono="neutro">Disattivata</Badge>}
              </div>

              <div className="mt-3 border-t border-line pt-3">
                <AzioniContatto
                  telefono={s.telefono}
                  email={s.email}
                  nome={s.referente ?? undefined}
                  compatto
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                <Azioni squadra={s} />
              </div>
            </div>
          ))}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Squadra</th>
                  <th>Località</th>
                  <th>Referente</th>
                  <th>Contatti</th>
                  <th>Campi</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {squadre.map((s) => (
                  <tr key={s.id} className={s.attiva ? '' : 'opacity-50'}>
                    <td>
                      <span className="font-medium">{s.nome}</span>
                      {s.sito && (
                        <a
                          href={s.sito.startsWith('http') ? s.sito : `https://${s.sito}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-[11px] text-nvg hover:underline"
                        >
                          {s.sito}
                        </a>
                      )}
                    </td>
                    <td className="text-muted">
                      {[s.citta, s.provincia].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="text-muted">{s.referente ?? '—'}</td>
                    <td>
                      <AzioniContatto
                        telefono={s.telefono}
                        email={s.email}
                        nome={s.referente ?? undefined}
                        compatto
                      />
                    </td>
                    <td className="text-xs text-muted">
                      {s.campi.length === 0 ? (
                        '—'
                      ) : (
                        <span className="flex flex-col gap-0.5">
                          {s.campi.map((c) => (
                            <Link
                              key={c.id}
                              href={`/admin/campi/${c.id}`}
                              className="hover:text-nvg"
                            >
                              {c.nome}
                            </Link>
                          ))}
                        </span>
                      )}
                    </td>
                    <td>
                      <Badge tono={s.attiva ? 'ok' : 'neutro'}>
                        {s.attiva ? 'Attiva' : 'Disattivata'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex gap-2">
                        <Azioni squadra={s} />
                      </div>
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

function Azioni({ squadra }: { squadra: Squadra }) {
  return (
    <>
      <BottoneModale
        etichetta="Modifica"
        icona="modifica"
        titolo={`Modifica "${squadra.nome}"`}
        className="btn-ghost btn-sm"
        larga
      >
        <FormAzione azione={salvaSquadra}>
          <input type="hidden" name="id" value={squadra.id} />
          <CampiSquadra squadra={squadra} />
          <Invia icona="salva">Salva</Invia>
        </FormAzione>
      </BottoneModale>

      <AzioneBottone
        azione={eliminaSquadra}
        valori={{ id: squadra.id }}
        icona="elimina"
        conferma={`Eliminare "${squadra.nome}"? Se è collegata a dei campi verrà solo disattivata.`}
        className="btn-danger btn-sm"
      >
        Elimina
      </AzioneBottone>
    </>
  );
}

function CampiSquadra({ squadra }: { squadra?: Squadra }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Nome *" span>
        <input name="nome" required defaultValue={squadra?.nome} className="input" />
      </Campo>

      <Campo label="Referente">
        <input name="referente" defaultValue={squadra?.referente ?? ''} className="input" />
      </Campo>

      <Campo label="Telefono">
        <input name="telefono" type="tel" defaultValue={squadra?.telefono ?? ''} className="input" />
      </Campo>

      <Campo label="Email">
        <input name="email" type="email" defaultValue={squadra?.email ?? ''} className="input" />
      </Campo>

      <Campo label="Sito / pagina">
        <input name="sito" defaultValue={squadra?.sito ?? ''} className="input" />
      </Campo>

      <Campo label="Città">
        <input name="citta" defaultValue={squadra?.citta ?? ''} className="input" />
      </Campo>

      <Campo label="Provincia">
        <input
          name="provincia"
          maxLength={4}
          defaultValue={squadra?.provincia ?? ''}
          className="input uppercase"
          placeholder="es. TO"
        />
      </Campo>

      <Campo label="Note" span>
        <textarea name="note" rows={3} defaultValue={squadra?.note ?? ''} className="input" />
      </Campo>

      <label className="flex min-w-0 items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="attiva"
          defaultChecked={squadra ? squadra.attiva : true}
          className="h-4 w-4 accent-[color:var(--nvg)]"
        />
        Attiva (selezionabile quando si associa un campo)
      </label>
    </div>
  );
}
