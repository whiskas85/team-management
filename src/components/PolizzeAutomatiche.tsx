import { prisma } from '@/lib/db';
import { nomeCompleto } from '@/lib/format';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { Badge } from './ui';
import { impostaPolizzeAutomatiche } from '@/actions/assicurazione';

/**
 * L'interruttore delle polizze che si attivano da sole.
 *
 * Il caso per cui esiste è la domenica mattina: alle otto si è in viaggio,
 * nessuno apre il gestionale, e chi non è stato coperto il giovedì arriva in
 * campo scoperto. Un'ora prima è l'ultimo momento in cui rimediare, ed è
 * esattamente quello in cui non c'è più nessuno a farlo.
 *
 * **Sta spenta di suo, e chi la accende ci mette il nome.** Ogni polizza è un
 * soldo che esce e non torna: una cosa che spende da sola non può essere il
 * comportamento di serie, e non può nemmeno essere anonima — le polizze
 * automatiche partono a firma di chi ha acceso l'interruttore.
 *
 * Non salta nessun controllo: passa dallo stesso pulsante «Assicura», quindi
 * copre solo chi ha detto «ci sono», ha la quota saldata o dichiarata e i dati
 * anagrafici a posto. Quello che fa è **non dimenticarsene**.
 */
export async function PolizzeAutomatiche() {
  const conf = await prisma.impostazioni.findUnique({ where: { id: 'app' } });
  const acceso = conf?.assicuraAuto ?? false;
  const anticipo = conf?.assicuraAnticipoMin ?? 60;

  const firma = conf?.assicuraAutoDaId
    ? await prisma.user.findUnique({
        where: { id: conf.assicuraAutoDaId },
        select: { nome: true, cognome: true, callsign: true },
      })
    : null;

  return (
    <div className="card mt-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="titolo-sezione">Polizze automatiche</p>
        <Badge tono={acceso ? 'ok' : 'neutro'}>{acceso ? 'accese' : 'spente'}</Badge>
      </div>

      <p className="mt-2 text-xs text-muted">
        {acceso ? (
          <>
            Chi è pronto viene coperto da solo{' '}
            <span className="num text-ink">{anticipo}</span> minuti prima dell’attività
            {firma ? <>, a nome di {nomeCompleto(firma)}</> : ''}.
          </>
        ) : (
          'Si assicura solo a mano. Accendendole, chi ha detto «ci sono» e ha la quota a posto viene coperto poco prima dell’attività, senza che nessuno debba ricordarsene.'
        )}
      </p>

      <FormAzione azione={impostaPolizzeAutomatiche} className="mt-3 space-y-3">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="acceso"
            defaultChecked={acceso}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span>Attiva le polizze da sola</span>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Quanto prima</span>
          <input
            type="number"
            name="anticipo"
            min={10}
            max={1440}
            step={5}
            defaultValue={anticipo}
            className="input num w-24"
          />
          <span className="text-muted">minuti</span>
        </label>

        <Invia className="btn-ghost btn-sm w-full justify-center" icona="salva">
          Salva
        </Invia>
      </FormAzione>

      <p className="mt-2 text-[11px] text-muted">
        Vale solo dove il portale federale è collegato davvero: nell’ambiente di test nessuna
        polizza parte, perché ne consumerebbe una vera.
      </p>
    </div>
  );
}
