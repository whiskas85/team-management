import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtDateTime } from '@/lib/format';
import { eAperto, etichettaDestinatari, loRiguarda, puoFareSondaggi } from '@/lib/sondaggi';
import { Badge, Intestazione, Vuoto } from '@/components/ui';
import { BottoneModale } from '@/components/Modale';
import { ScegliVista } from '@/components/ScegliVista';
import { FormSondaggio } from '@/components/FormSondaggio';
import { ContoAllaRovescia } from '@/components/ContoAllaRovescia';

export const dynamic = 'force-dynamic';

const VISTE = [
  { chiave: 'correnti', href: '/sondaggi', testo: 'Aperti' },
  { chiave: 'storico', href: '/sondaggi?vista=storico', testo: 'Storico' },
];

/**
 * Le domande aperte, e quelle a cui si è già risposto.
 *
 * **Si vede solo quello che riguarda chi guarda**: un sondaggio per la squadra
 * non compare a un contatto, e uno per i nuovi non intasa la pagina di chi è
 * dentro da tre anni. Non è pudore, è che una pagina piena di domande che non
 * ti spettano smette di essere una pagina che apri.
 *
 * Aperti e storico stanno dietro allo stesso indirizzo, come nel calendario: a
 * cose fatte non si vota più, ma il risultato resta — ed è il motivo per cui un
 * sondaggio è meglio di un giro di messaggi.
 */
export default async function SondaggiPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const me = await requireUser();
  const { vista } = await searchParams;
  const storico = vista === 'storico';

  const tutti = await prisma.sondaggio.findMany({
    orderBy: [{ scadeIl: 'asc' }, { creatoIl: 'desc' }],
    include: {
      creatoDa: { select: { nome: true, cognome: true, callsign: true } },
      opzioni: { select: { id: true, testo: true, voti: { select: { userId: true } } } },
      evento: { select: { id: true, titolo: true } },
    },
  });

  const miei = tutti.filter((s) => loRiguarda(s.destinatari, me.stato));
  const elenco = miei.filter((s) => (storico ? !eAperto(s) : eAperto(s)));

  return (
    <>
      <Intestazione
        titolo="Sondaggi"
        sottotitolo={
          storico
            ? 'Le domande chiuse, con il risultato'
            : 'Le domande aperte: rispondi, e puoi cambiare idea finché sono aperte'
        }
        azioni={
          <>
            <ScegliVista viste={VISTE} attuale={storico ? 'storico' : 'correnti'} />
            {puoFareSondaggi(me.roles) && (
              <BottoneModale etichetta="Nuovo sondaggio" icona="aggiungi" titolo="Nuovo sondaggio" larga>
                <FormSondaggio />
              </BottoneModale>
            )}
          </>
        }
      />

      {elenco.length === 0 ? (
        <Vuoto
          testo={
            storico
              ? 'Nessun sondaggio chiuso: quando se ne chiude uno, il risultato resta qui.'
              : 'Nessuna domanda aperta in questo momento.'
          }
        />
      ) : (
        <div className="space-y-3">
          {elenco.map((s) => {
            const hoVotato = s.opzioni.some((o) => o.voti.some((v) => v.userId === me.id));
            const votanti = new Set(s.opzioni.flatMap((o) => o.voti.map((v) => v.userId))).size;

            return (
              <Link
                key={s.id}
                href={`/sondaggi/${s.id}`}
                className="card block transition-colors hover:border-nvgdim"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-medium">{s.domanda}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {etichettaDestinatari[s.destinatari]} ·{' '}
                      {s.creatoDa.callsign ?? `${s.creatoDa.nome} ${s.creatoDa.cognome}`} ·{' '}
                      <span className="num">
                        {votanti} {votanti === 1 ? 'risposta' : 'risposte'}
                      </span>
                    </p>
                  </div>

                  {/* Chi ha già risposto lo sa: il verde dice «fatto», e serve
                      a non riaprire per controllare. */}
                  {!storico && (
                    <Badge tono={hoVotato ? 'ok' : 'warn'}>
                      {hoVotato ? 'hai risposto' : 'da rispondere'}
                    </Badge>
                  )}
                  {storico && s.evento && <Badge tono="info">è diventato un’attività</Badge>}
                </div>

                {/* Il tempo che resta scorre davvero: qui dentro non è una
                    fotografia come nella notifica. */}
                {!storico && s.scadeIl && (
                  <p className="mt-2 text-xs text-muted">
                    <ContoAllaRovescia
                      scadenza={s.scadeIl.toISOString()}
                      etichetta="si vota per"
                      scaduto="voto chiuso"
                    />
                  </p>
                )}
                {storico && (
                  <p className="num mt-2 text-xs text-muted">
                    {s.chiusoIl
                      ? `chiuso il ${fmtDateTime(s.chiusoIl)}`
                      : s.scadeIl
                        ? `scaduto il ${fmtDateTime(s.scadeIl)}`
                        : ''}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
