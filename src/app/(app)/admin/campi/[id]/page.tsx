import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { fmtDateTime } from '@/lib/format';
import { Intestazione } from '@/components/ui';
import { Mappa } from '@/components/Mappa';
import { AzioniContatto } from '@/components/AzioniContatto';
import { Conferma, FormAzione } from '@/components/Form';
import { FormCampo } from '@/components/FormCampo';
import { Invia } from '@/components/Bottone';
import { eliminaCampo, salvaCampo } from '@/actions/campi';

export default async function CampoPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermesso(isAdmin);
  const { id } = await params;

  // oltre alle attive teniamo quella già collegata, anche se disattivata:
  // altrimenti sparirebbe dalla tendina e si perderebbe al primo salvataggio
  const squadre = await prisma.squadraEsterna.findMany({
    where: { OR: [{ attiva: true }, { campi: { some: { id } } }] },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, attiva: true },
  });

  const campo = await prisma.field.findUnique({
    where: { id },
    include: {
      squadra: true,
      events: {
        orderBy: { inizio: 'desc' },
        take: 10,
        select: { id: true, titolo: true, inizio: true },
      },
    },
  });
  if (!campo) notFound();

  return (
    <>
      <Link href="/admin/campi" className="mb-4 inline-block text-xs text-muted hover:text-nvg">
        ← Campi
      </Link>

      <Intestazione titolo={campo.nome} sottotitolo="Modifica scheda campo" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card">
            <FormAzione azione={salvaCampo}>
              <FormCampo campo={campo} squadre={squadre} />
              <Invia icona="salva">
            Salva
          </Invia>
            </FormAzione>

            <FormAzione azione={eliminaCampo} className="mt-4 border-t border-line pt-4">
              <input type="hidden" name="id" value={campo.id} />
              <Conferma messaggio="Eliminare il campo? Se è collegato a eventi verrà solo archiviato." icona="elimina">
            Elimina campo
          </Conferma>
            </FormAzione>
          </div>
        </div>

        <div className="space-y-6">
          {campo.lat !== null && campo.lng !== null && (
            <div className="card">
              <p className="titolo-sezione mb-3">Posizione</p>
              <Mappa lat={campo.lat} lng={campo.lng} nome={campo.nome} />
            </div>
          )}

          {campo.squadra && (
            <div className="card">
              <p className="titolo-sezione mb-3">Gestito da</p>
              <p className="font-medium">{campo.squadra.nome}</p>
              {campo.squadra.referente && (
                <p className="text-xs text-muted">Referente: {campo.squadra.referente}</p>
              )}
              <div className="mt-3">
                <AzioniContatto
                  telefono={campo.squadra.telefono}
                  email={campo.squadra.email}
                  nome={campo.squadra.referente ?? undefined}
                  compatto
                />
              </div>
            </div>
          )}

          <div className="card">
          <p className="titolo-sezione mb-3">Ultimi eventi qui</p>
          {campo.events.length === 0 ? (
            <p className="text-sm text-muted">Nessun evento su questo campo.</p>
          ) : (
            <ul className="space-y-2">
              {campo.events.map((e) => (
                <li key={e.id}>
                  <Link href={`/calendario/${e.id}`} className="text-sm hover:text-nvg">
                    {e.titolo}
                  </Link>
                  <p className="text-xs text-muted">{fmtDateTime(e.inizio)}</p>
                </li>
              ))}
            </ul>
          )}
          </div>
        </div>
      </div>
    </>
  );
}
