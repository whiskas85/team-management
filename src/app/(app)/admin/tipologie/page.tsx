import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { classeColore, isAdmin } from '@/lib/domain';
import { umanizza } from '@/lib/format';
import { Badge, Campo, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { SelettoreColore } from '@/components/SelettoreColore';
import { OrdinaTipologie } from '@/components/OrdinaTipologie';
import { eliminaTipologia, riordinaTipologie, salvaTipologia } from '@/actions/tipologie';
import { BottoneElimina } from '@/components/CardRiga';

const QUOTE = [
  'EVENTO',
  'TORNEO',
  'GARA',
  'ALLENAMENTO',
  'ISCRIZIONE',
  'TESSERA_FIGT',
  'ALTRO',
] as const;

type Tipologia = {
  id: string;
  nome: string;
  descrizione: string | null;
  colore: string;
  tipoQuota: string;
  riserve: boolean;
  riunione: boolean;
  soloInterno: boolean;
  certMedico: boolean;
  certAgonistico: boolean;
  ordine: number;
  attivo: boolean;
};

export default async function TipologiePage() {
  await requirePermesso(isAdmin);

  const tipologie = await prisma.tipoAttivita.findMany({
    orderBy: [{ attivo: 'desc' }, { ordine: 'asc' }, { nome: 'asc' }],
    include: { _count: { select: { events: true } } },
  });

  return (
    <>
      <Intestazione
        titolo="Tipologie di attività"
        sottotitolo="Dati di base: le voci che compaiono nella tendina quando crei un'attività"
        azioni={
          <BottoneModale etichetta="Aggiungi tipologia" icona="aggiungi" titolo="Nuova tipologia">
            <FormAzione azione={salvaTipologia}>
              <CampiTipologia />
              <Invia icona="salva">Aggiungi</Invia>
            </FormAzione>
          </BottoneModale>
        }
      />

      {tipologie.length === 0 ? (
        <Vuoto testo="Nessuna tipologia definita: aggiungine una per poter creare attività." />
      ) : (
        <OrdinaTipologie
          azione={riordinaTipologie}
          righe={tipologie.map((t) => ({
            id: t.id,
            attivo: t.attivo,
            // la card la disegna OrdinaTipologie, con la maniglia in testa:
            // qui dentro c'è lo schema di sempre, senza una seconda cornice
            card: (
              <>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span
                        className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-sm border ${classeColore(t.colore)}`}
                        title={`Colore nel calendario: ${t.colore}`}
                      />
                      <span className="break-words font-medium">{t.nome}</span>
                    </span>
                    {t.descrizione && (
                      <p className="mt-0.5 break-words text-[11px] text-muted">{t.descrizione}</p>
                    )}
                  </div>
                  <div className="-mr-1 -mt-1 shrink-0">
                    <EliminaTipologia tipologia={t} />
                  </div>
                </div>
                <p className="num mt-2 text-xs text-muted">
                  Quote come {umanizza(t.tipoQuota)} · {t._count.events} attività
                </p>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {!t.attivo && <Badge tono="neutro">Disattivata</Badge>}
                  {t.riserve && <Badge tono="warn">Titolari e riserve</Badge>}
                  {t.riunione && <Badge tono="info">Riunione</Badge>}
                  {t.soloInterno && <Badge tono="info">Solo squadra</Badge>}
                  {t.certAgonistico && <Badge tono="danger">Cert. agonistico</Badge>}
                  {!t.certMedico && <Badge tono="neutro">Senza certificato</Badge>}
                </span>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Azioni tipologia={t} />
                </div>
              </>
            ),
            celle: (
              <>
                <td>
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-3.5 w-3.5 shrink-0 rounded-sm border ${classeColore(t.colore)}`}
                      title={`Colore nel calendario: ${t.colore}`}
                    />
                    <span className="font-medium">{t.nome}</span>
                  </span>
                </td>
                <td className="text-muted">{t.descrizione ?? '—'}</td>
                <td className="text-muted">{umanizza(t.tipoQuota)}</td>
                <td>
                  <span className="flex flex-wrap gap-1.5">
                    {t.riserve && <Badge tono="warn">Titolari e riserve</Badge>}
                    {t.soloInterno && <Badge tono="info">Solo squadra</Badge>}
                    {t.certAgonistico && <Badge tono="danger">Cert. agonistico</Badge>}
                    {!t.certMedico && <Badge tono="neutro">Senza certificato</Badge>}
                    {!t.riserve && !t.soloInterno && !t.certAgonistico && t.certMedico && (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </span>
                </td>
                <td className="text-muted num">{t._count.events}</td>
                <td>
                  <Badge tono={t.attivo ? 'ok' : 'neutro'}>
                    {t.attivo ? 'Attiva' : 'Disattivata'}
                  </Badge>
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Azioni tipologia={t} />
                    <EliminaTipologia tipologia={t} />
                  </div>
                </td>
              </>
            ),
          }))}
        />
      )}
    </>
  );
}

function Azioni({ tipologia }: { tipologia: Tipologia }) {
  return (
    <>
      <BottoneModale
        etichetta="Modifica"
        icona="modifica"
        titolo={`Modifica "${tipologia.nome}"`}
        className="btn-ghost btn-sm"
      >
        <FormAzione azione={salvaTipologia}>
          <input type="hidden" name="id" value={tipologia.id} />
          <CampiTipologia tipologia={tipologia} />
          <Invia icona="salva">Salva</Invia>
        </FormAzione>
      </BottoneModale>
    </>
  );
}

/** Il cestino di una tipologia: in alto a destra della sua card. */
function EliminaTipologia({ tipologia }: { tipologia: Tipologia }) {
  return (
    <BottoneElimina
      azione={eliminaTipologia}
      valori={{ id: tipologia.id }}
      conferma={`Eliminare la tipologia "${tipologia.nome}"? Se è già usata verrà solo disattivata.`}
      etichetta={`Elimina ${tipologia.nome}`}
    />
  );
}

function CampiTipologia({ tipologia }: { tipologia?: Tipologia }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Nome *">
        <input name="nome" required defaultValue={tipologia?.nome} className="input" />
      </Campo>

      <Campo label="Colore nel calendario">
        <SelettoreColore valoreIniziale={tipologia?.colore ?? 'verde'} />
      </Campo>

      <Campo label="Descrizione" span>
        <input
          name="descrizione"
          defaultValue={tipologia?.descrizione ?? ''}
          className="input"
          placeholder="A cosa serve questa tipologia"
        />
      </Campo>

      <Campo label="Quote generate come">
        <select name="tipoQuota" defaultValue={tipologia?.tipoQuota ?? 'EVENTO'} className="input">
          {QUOTE.map((q) => (
            <option key={q} value={q}>
              {umanizza(q)}
            </option>
          ))}
        </select>
      </Campo>

      <label className="flex min-w-0 items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="certMedico"
          defaultChecked={tipologia?.certMedico ?? true}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span className="min-w-0">
          Richiede il certificato medico
          <span className="block text-[11px] text-muted">
            Acceso su tutto ciò che si gioca. Spegnilo dove non si corre — riunioni, cene, corsi in
            aula — e chi non ha il certificato potrà segnarsi lo stesso.
          </span>
        </span>
      </label>

      <label className="flex min-w-0 items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="certAgonistico"
          defaultChecked={tipologia?.certAgonistico ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span className="min-w-0">
          Richiede il certificato agonistico
          <span className="block text-[11px] text-muted">
            Con questo attivo il certificato non agonistico non basta: chi ha solo quello viene
            trattato come chi non ne ha, e non può segnarsi.
          </span>
        </span>
      </label>

      <label className="flex min-w-0 items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="soloInterno"
          defaultChecked={tipologia?.soloInterno ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span className="min-w-0">
          Riservata alla squadra
          <span className="block text-[11px] text-muted">
            Con questo attivo l’attività non può essere rilasciata a tutti: sparisce il pulsante e
            resta solo il rilascio interno.
          </span>
        </span>
      </label>

      <label className="flex min-w-0 items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="riserve"
          defaultChecked={tipologia?.riserve ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span className="min-w-0">
          Prevede titolari e riserve
          <span className="block text-[11px] text-muted">
            Attivalo per gare e tornei, dove il Team Leader deve comporre la formazione. Sugli
            allenamenti lasciarlo spento: lo schieramento non comparirà proprio.
          </span>
        </span>
      </label>

      <label className="flex min-w-0 items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="riunione"
          defaultChecked={tipologia?.riunione ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span className="min-w-0">
          È una riunione
          <span className="block text-[11px] text-muted">
            Si fa in una sala o in videochiamata, non in campo. Le tipologie con questo segno sono
            quelle che si possono creare al volo da un’attività, e su di esse spariscono ritrovo,
            posti e quote: a una riunione non servono.
          </span>
        </span>
      </label>

      <label className="flex min-w-0 items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="attivo"
          defaultChecked={tipologia ? tipologia.attivo : true}
          className="h-4 w-4 accent-[color:var(--nvg)]"
        />
        Attiva (selezionabile quando si crea un’attività)
      </label>
    </div>
  );
}
