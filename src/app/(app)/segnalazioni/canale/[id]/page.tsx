import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { nomeCompleto } from '@/lib/format';
import { etichettaDestinatari } from '@/lib/sondaggi';
import { iconaBacheca } from '@/lib/icone-bacheca';
import {
  etichettaFirma,
  filtroCanali,
  gestisceSegnalazioni,
  inVoce,
  includiVoce,
  personeCitabili,
  puoSegnalareIn,
} from '@/lib/segnalazioni-canali';
import { eliminaCanale } from '@/actions/canali-segnalazioni';
import { Badge, Intestazione, Vuoto } from '@/components/ui';
import { Icona } from '@/components/Icona';
import { Markdown } from '@/components/Markdown';
import { BottoneModale } from '@/components/Modale';
import { BottoneElimina } from '@/components/CardRiga';
import { FormCanale } from '@/components/FormCanale';
import { FormSegnalazione } from '@/components/FormSegnalazione';
import { ElencoSegnalazioni } from '@/components/ElencoSegnalazioni';
import { ScegliVista } from '@/components/ScegliVista';

export const dynamic = 'force-dynamic';

/**
 * Un canale: cosa si segnala qui, il modulo per farlo, e le segnalazioni
 * fatte — le proprie, o tutte per chi le gestisce.
 */
export default async function CanalePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const me = await requireUser();
  const { id } = await params;
  const storico = (await searchParams).vista === 'storico';
  const canale = await prisma.canaleSegnalazioni.findFirst({
    where: { AND: [{ id }, filtroCanali(me)] },
  });
  if (!canale) notFound();

  const gestisce = gestisceSegnalazioni(me.roles);
  const admin = isAdmin(me.roles);
  const [segnalazioni, citabili, io] = await Promise.all([
    prisma.segnalazioneCanale.findMany({
      where: {
        canaleId: canale.id,
        ...(gestisce ? {} : { autoreId: me.id }),
        // le chiuse stanno nello storico: davanti restano quelle ancora vive
        stato: storico ? 'CHIUSA' : { not: 'CHIUSA' },
      },
      orderBy: [{ stato: 'asc' }, { aggiornataIl: 'desc' }],
      include: includiVoce,
    }),
    personeCitabili(me),
    prisma.user.findUnique({
      where: { id: me.id },
      select: { nome: true, cognome: true, callsign: true },
    }),
  ]);

  const puoScrivere = puoSegnalareIn(canale, me);

  return (
    <>
      <Intestazione
        titolo={canale.titolo}
        sottotitolo={`Segnalazioni · ${etichettaFirma[canale.firma].toLowerCase()}`}
        azioni={
          <>
            <ScegliVista
              viste={[
                { chiave: 'aperte', href: `/segnalazioni/canale/${canale.id}`, testo: 'Aperte' },
                {
                  chiave: 'storico',
                  href: `/segnalazioni/canale/${canale.id}?vista=storico`,
                  testo: 'Storico',
                },
              ]}
              attuale={storico ? 'storico' : 'aperte'}
            />
            {admin && (
              <BottoneModale
                etichetta="Configura"
                icona="impostazioni"
                titolo="Configura il canale"
                className="btn-ghost"
                larga
                compatto
              >
                <FormCanale
                  canale={{
                    id: canale.id,
                    titolo: canale.titolo,
                    descrizione: canale.descrizione,
                    icona: canale.icona,
                    firma: canale.firma,
                    pubblico: canale.pubblico,
                    conAllegati: canale.conAllegati,
                    attivo: canale.attivo,
                  }}
                />
                <div className="mt-6 border-t border-line pt-4">
                  <BottoneElimina
                    azione={eliminaCanale}
                    valori={{ id: canale.id }}
                    conferma={`Togliere «${canale.titolo}»? Se dentro ci sono segnalazioni viene solo spento: quelle restano.`}
                    etichetta={`Togli ${canale.titolo}`}
                  />
                </div>
              </BottoneModale>
            )}
          </>
        }
      />

      {/* Una colonna sola, tutta larga: prima cosa si segnala, poi le
          segnalazioni, e in fondo il modulo per farne una nuova — di aperte
          ce ne sono poche, e il modulo resta a portata. Le chiuse stanno
          nello storico. */}
      <div className="space-y-6">
        {!storico && (
          <div className="card">
            <p className="titolo-sezione mb-3 flex items-center gap-2">
              <Icona nome={iconaBacheca(canale.icona)} size={15} /> Cosa si segnala qui
            </p>
            {canale.descrizione ? (
              <Markdown testo={canale.descrizione} />
            ) : (
              <p className="text-sm text-muted">Racconta quello che vuoi far sapere.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tono="neutro">{etichettaFirma[canale.firma]}</Badge>
              {canale.conAllegati && <Badge tono="neutro">con allegati</Badge>}
              {gestisce && <Badge tono="neutro">{etichettaDestinatari[canale.pubblico]}</Badge>}
              {!canale.attivo && <Badge tono="warn">spento</Badge>}
            </div>
          </div>
        )}

        <section>
          <h2 className="titolo-sezione mb-3">
            {storico
              ? gestisce
                ? 'Storico · le segnalazioni chiuse'
                : 'Storico · le tue segnalazioni chiuse'
              : gestisce
                ? 'Le segnalazioni aperte'
                : 'Le tue segnalazioni aperte'}
          </h2>
          {segnalazioni.length === 0 ? (
            <Vuoto
              testo={
                storico
                  ? 'Nessuna segnalazione chiusa.'
                  : 'Nessuna segnalazione aperta. Se c’è qualcosa da raccontare, qui sotto.'
              }
            />
          ) : (
            <ElencoSegnalazioni
              voci={segnalazioni.map((s) => inVoce(s, me))}
              conCanale={false}
            />
          )}
        </section>

        {!storico && (
          <div className="card">
            <p className="titolo-sezione mb-3">Nuova segnalazione</p>
            {puoScrivere ? (
              <FormSegnalazione
                canaleId={canale.id}
                firma={canale.firma}
                conAllegati={canale.conAllegati}
                persone={citabili.persone}
                nome={io ? nomeCompleto(io) : ''}
              />
            ) : (
              <p className="text-sm text-muted">
                {canale.attivo
                  ? 'Questo canale non è rivolto a te.'
                  : 'Il canale è spento: non accetta segnalazioni nuove.'}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
