import type { Role } from '@prisma/client';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { POTERI_RUOLO, SPIEGA_RUOLO, etichettaRuolo, isAdmin, tonoRuolo } from '@/lib/domain';
import { Badge, Elenco, Intestazione } from '@/components/ui';

const RUOLI: Role[] = ['ADMIN', 'AMMINISTRAZIONE', 'SEGRETERIA', 'TL', 'ATLETA'];

/**
 * I ruoli non sono dati modificabili: stanno nel codice, perché a ognuno
 * corrispondono permessi veri. Questa pagina li mette in chiaro — chi è cosa e
 * cosa può fare — così assegnarli non è più un indovinello, e si vede subito
 * quante persone hanno in mano ciascuna chiave.
 */
export default async function RuoliPage() {
  await requirePermesso(isAdmin);

  const conteggi = await prisma.user.findMany({
    where: { stato: { not: 'DISABILITATO' } },
    select: { roles: true },
  });

  const quanti = (r: Role) => conteggi.filter((u) => u.roles.includes(r)).length;

  return (
    <>
      <Intestazione
        titolo="Ruoli"
        sottotitolo="Chi può fare cosa. I ruoli si cumulano: un operatore può averne più d'uno"
      />

      <div className="mb-6 rounded-md border border-line bg-surface2 px-4 py-3 text-sm text-muted">
        Questi ruoli non si aggiungono e non si rinominano: a ognuno corrispondono permessi scritti
        nel gestionale. Si assegnano dalla scheda della persona, oppure a più persone insieme
        dall’elenco <strong className="text-ink">Operatori</strong>.
      </div>

      <Elenco
        cards={RUOLI.map((r) => (
          <div key={r} className="card">
            <div className="flex items-start justify-between gap-3">
              <Badge tono={tonoRuolo[r]}>{etichettaRuolo[r]}</Badge>
              <span className="num text-xs text-muted">
                {quanti(r)} {quanti(r) === 1 ? 'operatore' : 'operatori'}
              </span>
            </div>
            <p className="mt-2 text-sm">{SPIEGA_RUOLO[r]}</p>
            <ul className="mt-2 space-y-1 border-t border-line pt-2 text-xs text-muted">
              {POTERI_RUOLO[r].map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-nvg">·</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        tabella={
          <table className="tabella">
            <thead>
              <tr>
                <th>Ruolo</th>
                <th>A cosa serve</th>
                <th>Cosa può fare</th>
                <th>Quanti ce l’hanno</th>
              </tr>
            </thead>
            <tbody>
              {RUOLI.map((r) => (
                <tr key={r}>
                  <td className="align-top">
                    <Badge tono={tonoRuolo[r]}>{etichettaRuolo[r]}</Badge>
                  </td>
                  <td className="align-top">{SPIEGA_RUOLO[r]}</td>
                  <td className="align-top">
                    <ul className="space-y-1 text-xs text-muted">
                      {POTERI_RUOLO[r].map((p) => (
                        <li key={p} className="flex gap-2">
                          <span className="text-nvg">·</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="align-top num text-muted">{quanti(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      />
    </>
  );
}
