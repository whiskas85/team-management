import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { statoEffettivo, tonoCertificato, vedeAreaTesseramento } from '@/lib/domain';
import { fmtDate, giorniA, umanizza } from '@/lib/format';
import { Badge, Campo, Intestazione, Vuoto } from '@/components/ui';
import { Conferma, FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { DateCertificato } from '@/components/DateCertificato';
import { Icona } from '@/components/Icona';
import { caricaCertificato, eliminaCertificato } from '@/actions/certificati';

export default async function MieiCertificatiPage() {
  const me = await requireUser();
  // il certificato serve solo a chi è tesserato: per i nuovi la sezione non esiste
  if (!vedeAreaTesseramento(me.stato)) redirect('/profilo');

  const certificati = await prisma.medicalCertificate.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    include: { reviewedBy: { select: { nome: true, cognome: true } } },
  });

  return (
    <>
      <Intestazione
        titolo="I miei certificati medici"
        sottotitolo="Carica il certificato: resta in attesa finché l’amministrazione non lo approva"
      />

      <div className="mb-6 rounded-lg border border-line bg-surface p-4">
        <p className="titolo-sezione mb-2">Quale certificato serve</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-line bg-surface2 px-3 py-2">
            <p className="text-sm font-medium">Non agonistico</p>
            <p className="mt-1 text-xs text-muted">
              Visita di base dal medico di famiglia o dallo sportivo. Basta per allenamenti e
              partite ordinarie.
            </p>
          </div>
          <div className="rounded-md border border-nvg/30 bg-nvg/5 px-3 py-2">
            <p className="text-sm font-medium text-nvg">Agonistico</p>
            <p className="mt-1 text-xs text-muted">
              Rilasciato da un medico dello sport, con elettrocardiogramma sotto sforzo. Serve per
              gare e tornei: dove è richiesto, il non agonistico <strong>non è sufficiente</strong>
              {' '}e vale come non averlo.
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Entrambi valgono 364 giorni dal rilascio. Se hai l’agonistico copri anche tutto il resto.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="card">
            <p className="titolo-sezione mb-4">Nuovo caricamento</p>
            <FormAzione azione={caricaCertificato}>
              <Campo label="Tipo">
                <select name="tipo" className="input" defaultValue="NON_AGONISTICO">
                  <option value="NON_AGONISTICO">Non agonistico</option>
                  <option value="AGONISTICO">Agonistico</option>
                </select>
              </Campo>

              <DateCertificato />

              <Campo label="File (PDF o foto) *">
                <input
                  type="file"
                  name="file"
                  required
                  accept="application/pdf,image/*"
                  className="input file:mr-3 file:rounded file:border-0 file:bg-nvg/15 file:px-3 file:py-1 file:text-nvg"
                />
              </Campo>

              <Campo label="Note">
                <textarea name="note" rows={2} className="input" />
              </Campo>

              <Invia className="btn-primary w-full" attesa="Caricamento…" icona="carica">
            Carica certificato
          </Invia>
              <p className="text-xs text-muted">Massimo 10 MB · PDF, JPG, PNG o WEBP.</p>
            </FormAzione>
          </div>
        </div>

        <div className="space-y-3 lg:col-span-2">
          {certificati.length === 0 ? (
            <Vuoto testo="Non hai ancora caricato certificati." />
          ) : (
            certificati.map((c) => {
              const stato = statoEffettivo(c);
              const giorni = giorniA(c.scadeIl);
              return (
                <div key={c.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{umanizza(c.tipo)}</h3>
                      <p className="mt-1 text-xs text-muted">
                        Rilasciato {fmtDate(c.rilasciatoIl)} · scade {fmtDate(c.scadeIl)}
                        {stato === 'VALIDO' && giorni !== null && giorni <= 30 && (
                          <span className="text-warn"> · fra {giorni} giorni</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        Caricato il {fmtDate(c.createdAt)}
                        {c.reviewedBy &&
                          ` · valutato da ${c.reviewedBy.nome} ${c.reviewedBy.cognome}`}
                      </p>
                    </div>
                    <Badge tono={tonoCertificato[stato]}>{umanizza(stato)}</Badge>
                  </div>

                  {c.motivoRifiuto && (
                    <p className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                      Motivo del rifiuto: {c.motivoRifiuto}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
                    <a
                      href={`/api/certificati/${c.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost btn-sm"
                    >
                      <Icona nome="apri" size={15} /> Apri allegato
                    </a>
                    <span className="text-xs text-muted">{c.fileName}</span>
                    {c.status === 'IN_ATTESA' && (
                      <FormAzione azione={eliminaCertificato} className="ml-auto">
                        <input type="hidden" name="id" value={c.id} />
                        <Conferma messaggio="Ritirare questo caricamento?" icona="elimina">
            Ritira
          </Conferma>
                      </FormAzione>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
