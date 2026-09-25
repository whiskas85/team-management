import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { etichettaDestinatari } from '@/lib/sondaggi';
import { iconaBacheca } from '@/lib/icone-bacheca';
import {
  etichettaFirma,
  filtroCanali,
  gestisceSegnalazioni,
  inVoce,
  includiVoce,
} from '@/lib/segnalazioni-canali';
import { Badge, Intestazione, Vuoto } from '@/components/ui';
import { Icona } from '@/components/Icona';
import { BottoneModale } from '@/components/Modale';
import { ScegliVista } from '@/components/ScegliVista';
import { FormCanale } from '@/components/FormCanale';
import { ElencoSegnalazioni } from '@/components/ElencoSegnalazioni';

export const dynamic = 'force-dynamic';

/**
 * Le segnalazioni: i canali in cui scrivere, e quello che si è scritto.
 *
 * Chi segnala vede **solo le sue**. Chi gestisce — admin e moderatori — vede
 * in cima quelle da prendere in mano, poi le chiuse dietro la loro vista.
 */
export default async function SegnalazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const me = await requireUser();
  const { vista } = await searchParams;
  const gestisce = gestisceSegnalazioni(me.roles);
  const admin = isAdmin(me.roles);
  // le chiuse stanno nello storico, per tutti: davanti restano quelle vive
  const chiuse = vista === 'storico' || vista === 'chiuse';

  const [canali, mie, daGestire] = await Promise.all([
    prisma.canaleSegnalazioni.findMany({
      where: filtroCanali(me),
      orderBy: [{ attivo: 'desc' }, { ordine: 'asc' }, { creatoIl: 'asc' }],
      include: {
        _count: {
          select: {
            segnalazioni: gestisce
              ? { where: { nuovaPerGestori: true, autoreId: { not: me.id } } }
              : { where: { autoreId: me.id, nuovaPerAutore: true } },
          },
        },
      },
    }),
    prisma.segnalazioneCanale.findMany({
      where: { autoreId: me.id, stato: chiuse ? 'CHIUSA' : { not: 'CHIUSA' } },
      orderBy: { aggiornataIl: 'desc' },
      include: includiVoce,
    }),
    gestisce
      ? prisma.segnalazioneCanale.findMany({
          where: {
            autoreId: { not: me.id },
            stato: chiuse ? 'CHIUSA' : { not: 'CHIUSA' },
          },
          // prima quelle con qualcosa di nuovo, poi le più recenti
          orderBy: [{ nuovaPerGestori: 'desc' }, { aggiornataIl: 'desc' }],
          include: includiVoce,
          take: chiuse ? 100 : undefined,
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <Intestazione
        titolo="Segnalazioni"
        sottotitolo={
          gestisce
            ? 'Quello che la squadra racconta a chi la gestisce: lo leggete solo tu, l’admin e i moderatori'
            : 'Racconta una cosa a chi gestisce il club: la leggono solo l’admin e i moderatori'
        }
        azioni={
          <>
            <ScegliVista
              viste={[
                { chiave: 'aperte', href: '/segnalazioni', testo: 'Aperte' },
                { chiave: 'storico', href: '/segnalazioni?vista=storico', testo: 'Storico' },
              ]}
              attuale={chiuse ? 'storico' : 'aperte'}
            />
            {admin && (
              <BottoneModale
                etichetta="Nuovo canale"
                icona="aggiungi"
                titolo="Nuovo canale di segnalazione"
                larga
              >
                <FormCanale />
              </BottoneModale>
            )}
          </>
        }
      />

      <div className="space-y-8">
        {gestisce && (
          <section>
            <h2 className="titolo-sezione mb-3">
              {chiuse ? 'Storico · chiuse, degli altri' : 'Da gestire'}
            </h2>
            {daGestire.length === 0 ? (
              <Vuoto
                testo={
                  chiuse ? 'Nessuna segnalazione chiusa.' : 'Nessuna segnalazione da gestire.'
                }
              />
            ) : (
              <ElencoSegnalazioni voci={daGestire.map((s) => inVoce(s, me))} />
            )}
          </section>
        )}

        {!chiuse && (
          <section>
            <h2 className="titolo-sezione mb-3">Canali</h2>
            {canali.length === 0 ? (
              <Vuoto
                testo={
                  admin
                    ? 'Nessun canale ancora. Creane uno: «Tornei», «Comportamenti», «Idee e feedback».'
                    : 'Per ora non c’è nessun canale in cui segnalare.'
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {canali.map((c) => (
                  <Link
                    key={c.id}
                    href={`/segnalazioni/canale/${c.id}`}
                    className={`card block transition-colors hover:border-nvgdim ${
                      c.attivo ? '' : 'border-dashed opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="flex min-w-0 items-center gap-2 break-words font-medium">
                        <Icona nome={iconaBacheca(c.icona)} size={16} /> {c.titolo}
                      </h3>
                      {c._count.segnalazioni > 0 && (
                        <span className="num shrink-0 rounded-full bg-nvg px-2 py-0.5 text-xs font-semibold text-bg">
                          {c._count.segnalazioni}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tono="neutro">{etichettaFirma[c.firma]}</Badge>
                      {c.conAllegati && <Badge tono="neutro">con allegati</Badge>}
                      {gestisce && <Badge tono="neutro">{etichettaDestinatari[c.pubblico]}</Badge>}
                      {!c.attivo && <Badge tono="warn">spento</Badge>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="titolo-sezione mb-3">
            {chiuse ? 'Storico · le tue segnalazioni chiuse' : 'Le tue segnalazioni aperte'}
          </h2>
          {mie.length === 0 ? (
            <Vuoto
              testo={
                chiuse
                  ? 'Nessuna tua segnalazione chiusa.'
                  : 'Nessuna segnalazione aperta. Per farne una, scegli un canale qui sopra.'
              }
            />
          ) : (
            <ElencoSegnalazioni voci={mie.map((s) => inVoce(s, me))} />
          )}
        </section>
      </div>
    </>
  );
}
