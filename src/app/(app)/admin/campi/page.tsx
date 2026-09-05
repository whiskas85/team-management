import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { fmtEuro, umanizza } from '@/lib/format';
import { Badge, Elenco, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { FormCampo } from '@/components/FormCampo';
import { Invia } from '@/components/Bottone';
import { Icona } from '@/components/Icona';
import { salvaCampo } from '@/actions/campi';

function mappaUrl(c: {
  lat: number | null;
  lng: number | null;
  indirizzo: string | null;
  citta: string | null;
  nome: string;
}) {
  const q =
    c.lat !== null && c.lng !== null
      ? `${c.lat},${c.lng}`
      : [c.indirizzo, c.citta, c.nome].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default async function CampiPage() {
  await requirePermesso(isAdmin);

  const [campi, squadre] = await Promise.all([
    prisma.field.findMany({
      orderBy: [{ attivo: 'desc' }, { nome: 'asc' }],
      include: { _count: { select: { events: true } }, squadra: { select: { nome: true } } },
    }),
    prisma.squadraEsterna.findMany({
      where: { attiva: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
  ]);

  return (
    <>
      <Intestazione
        titolo="Campi da gioco"
        sottotitolo="Anagrafica dei luoghi dove si gioca: contatti, posizione e costi"
        azioni={
          <BottoneModale etichetta="Aggiungi campo" icona="aggiungi" titolo="Nuovo campo" larga>
            <FormAzione azione={salvaCampo}>
              <FormCampo squadre={squadre} />
              <Invia icona="aggiungi">
            Aggiungi campo
          </Invia>
            </FormAzione>
          </BottoneModale>
        }
      />

      {campi.length === 0 ? (
        <Vuoto testo="Nessun campo registrato." />
      ) : (
        <Elenco
          cards={campi.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
                    {umanizza(c.tipo)}
                  </p>
                  <h3 className="mt-1 font-medium">{c.nome}</h3>
                  <p className="text-xs text-muted">
                    {[c.citta, c.provincia].filter(Boolean).join(' · ') || 'Località non indicata'}
                  </p>
                  {c.squadra && (
                    <p className="text-xs text-muted">Gestito da {c.squadra.nome}</p>
                  )}
                </div>
                {!c.attivo && <Badge tono="neutro">Archiviato</Badge>}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-xs">
                <span className="text-muted num">{fmtEuro(c.costo ? Number(c.costo) : null)}</span>
                <span className="text-muted num">· {c._count.events} eventi</span>
                <a
                  href={mappaUrl(c)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost btn-sm ml-auto"
                >
                  <Icona nome="campi" size={15} /> Mappa
                </a>
                <Link href={`/admin/campi/${c.id}`} className="btn-ghost btn-sm">
                  <Icona nome="modifica" size={15} /> Modifica
                </Link>
              </div>
            </div>
          ))}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Tipo</th>
                  <th>Gestito da</th>
                  <th>Località</th>
                  <th>Referente</th>
                  <th>Costo</th>
                  <th>Eventi</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campi.map((c) => (
                  <tr key={c.id} className={c.attivo ? '' : 'opacity-50'}>
                    <td className="font-medium">
                      {c.nome}
                      {!c.attivo && <span className="ml-2 text-xs text-muted">(archiviato)</span>}
                    </td>
                    <td className="text-muted">{umanizza(c.tipo)}</td>
                    <td className="text-muted">{c.squadra?.nome ?? 'nostro'}</td>
                    <td className="text-muted">
                      {[c.citta, c.provincia].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="text-muted">
                      {c.referente ?? '—'}
                      {c.telefono && <span className="block text-xs num">{c.telefono}</span>}
                    </td>
                    <td className="whitespace-nowrap text-muted num">
                      {fmtEuro(c.costo ? Number(c.costo) : null)}
                    </td>
                    <td className="text-xs text-muted num">{c._count.events}</td>
                    <td className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <a
                          href={mappaUrl(c)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost btn-sm"
                        >
                          <Icona nome="campi" size={15} /> Mappa
                        </a>
                        <Link href={`/admin/campi/${c.id}`} className="btn-ghost btn-sm">
                          <Icona nome="modifica" size={15} /> Modifica
                        </Link>
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
