import { prisma } from '@/lib/db';
import { fmtDate } from '@/lib/format';
import { AzioneBottone } from './AzioneBottone';
import { aggiornaPolizzeProva } from '@/actions/assicurazione';

/** Sotto questa soglia le polizze prova vanno ricomprate: meglio avvisare. */
const SCORTA = 5;

/**
 * Quante polizze prova restano da usare, nella stessa forma degli altri
 * riquadri della riga.
 *
 * Sta in due pagine perché due sono le domande a cui risponde: in cassa sono
 * credito prepagato, cioè soldi già usciti; nelle tessere sono le giornaliere
 * che restano per far giocare chi non è tesserato. Il numero è lo stesso e si
 * rilegge dal portale su richiesta, non a ogni apertura di pagina.
 */
export async function GiacenzaPolizze() {
  const cred = await prisma.credenzialeFigt.findUnique({
    where: { id: 'figt' },
    select: { polizzeResidue: true, polizzeAssegnate: true, polizzeLetteIl: true },
  });

  const lette =
    cred?.polizzeResidue !== null && cred?.polizzeResidue !== undefined && cred.polizzeLetteIl
      ? { residue: cred.polizzeResidue, assegnate: cred.polizzeAssegnate, il: cred.polizzeLetteIl }
      : null;

  const colore =
    lette === null ? 'text-muted' : lette.residue <= SCORTA ? 'text-danger' : 'text-nvg';

  return (
    <div className="card flex flex-col">
      <p className="titolo-sezione">Polizze prova</p>
      <p className={`mt-2 num text-2xl font-semibold ${colore}`}>{lette?.residue ?? '—'}</p>
      <p className="mt-1 text-xs text-muted">
        {lette === null
          ? cred
            ? 'mai lette dal portale'
            : 'portale non collegato'
          : `da usare · lette il ${fmtDate(lette.il)}`}
      </p>
      <div className="mt-3">
        <AzioneBottone
          azione={aggiornaPolizzeProva}
          valori={{}}
          icona="tessera"
          className="btn-ghost btn-sm w-full justify-center"
          attesa="Chiedo…"
          disabilitato={!cred}
        >
          Aggiorna
        </AzioneBottone>
      </div>
    </div>
  );
}
