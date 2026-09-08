import { fmtDate } from '@/lib/format';
import { GIORNI_PREAVVISO_SCADENZA } from '@/lib/domain';

/**
 * La vita di un certificato, disegnata.
 *
 * Una data di scadenza da sola non dice quanto manca: bisogna fare il conto a
 * mente, e nessuno lo fa. Qui la barra parte dal giorno della visita e finisce
 * a quello della scadenza, l'ultimo mese è giallo — il tempo che serve per
 * prenotare e rifarla — e il segno dice dove siamo adesso. In un colpo d'occhio
 * si vede se si è tranquilli o se è ora di muoversi.
 */
export function LineaCertificato({
  rilasciatoIl,
  scadeIl,
}: {
  rilasciatoIl: Date | null;
  scadeIl: Date;
}) {
  // senza la data della visita si disegna comunque l’ultimo anno: la scadenza
  // c’è sempre, ed è quella che interessa
  const fineMs = new Date(scadeIl).getTime();
  const inizio = rilasciatoIl ? new Date(rilasciatoIl).getTime() : fineMs - 364 * 86400000;
  const fine = fineMs;
  const ora = Date.now();
  const durata = Math.max(1, fine - inizio);

  // dove siamo, in percentuale sulla vita del certificato
  const posizione = Math.min(100, Math.max(0, ((ora - inizio) / durata) * 100));
  // da dove comincia il giallo: gli ultimi giorni di preavviso
  const preavviso = Math.min(
    100,
    Math.max(0, ((durata - GIORNI_PREAVVISO_SCADENZA * 86400000) / durata) * 100),
  );

  const scaduto = ora > fine;

  return (
    <div>
      <div className="relative h-3 overflow-hidden rounded-full bg-surface2">
        {/* il tratto tranquillo, e l'ultimo mese in giallo */}
        <div
          className="absolute inset-y-0 left-0 bg-nvg/30"
          style={{ width: `${preavviso}%` }}
        />
        <div
          className="absolute inset-y-0 bg-warn/40"
          style={{ left: `${preavviso}%`, right: 0 }}
        />
        {/* quanto è già passato */}
        <div
          className={`absolute inset-y-0 left-0 ${scaduto ? 'bg-danger/50' : 'bg-nvg/70'}`}
          style={{ width: `${posizione}%` }}
        />
        {/* dove siamo adesso */}
        {!scaduto && (
          <div
            className="absolute inset-y-0 w-0.5 bg-ink"
            style={{ left: `calc(${posizione}% - 1px)` }}
            title="oggi"
          />
        )}
      </div>

      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span className="num">{rilasciatoIl ? fmtDate(rilasciatoIl) : '—'}</span>
        <span className="num text-warn">ultimo mese</span>
        <span className="num">{fmtDate(scadeIl)}</span>
      </div>
    </div>
  );
}
