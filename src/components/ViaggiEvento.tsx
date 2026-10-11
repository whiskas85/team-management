import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fmtTime } from '@/lib/format';
import { arrivoSuggerito, casaDi, meta, nomeDi } from '@/lib/macchine';
import { etichettaModo } from '@/lib/viaggio';
import { chiediPassaggio, creaMacchina, rispondiPassaggio } from '@/actions/macchine';
import { AzioneBottone } from './AzioneBottone';
import { giornoDi } from '@/lib/giorni';
import { BottoneModale } from './Modale';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { FormMacchina } from './FormMacchina';
import { Icona } from './Icona';
import { linkNaviga } from './Naviga';
import { Badge } from './ui';

/**
 * Le macchine di un'attività, nella sua pagina: la mia situazione in cima — guido,
 * sono in macchina con qualcuno, mi hanno offerto un passaggio — e sotto tutte
 * le macchine, con chi c'è sopra e quanti posti restano.
 *
 * Gli indirizzi qui non ci sono: si leggono nella pagina del viaggio, a chi
 * spettano. Fa eccezione il **mio** punto di salita, che è mio.
 */
export async function ViaggiEvento({
  evento,
  me,
  miaRisposta,
}: {
  evento: {
    id: string;
    status: string;
    titolo: string;
    inizio: Date;
    fine: Date | null;
    ritrovo: string | null;
    ritrovoLat: number | null;
    ritrovoLng: number | null;
    oraRitrovo: Date | null;
    luogo: string | null;
    luogoLat: number | null;
    luogoLng: number | null;
    field: {
      nome: string;
      indirizzo: string | null;
      citta: string | null;
      lat: number | null;
      lng: number | null;
    } | null;
  };
  me: { id: string; admin: boolean };
  miaRisposta: string | null;
}) {
  const macchine = await prisma.macchina.findMany({
    where: { eventId: evento.id },
    orderBy: { createdAt: 'asc' },
    include: {
      autista: { select: { id: true, nome: true, cognome: true, callsign: true } },
      passeggeri: {
        where: { stato: { not: 'RIFIUTATO' } },
        orderBy: { invitatoIl: 'asc' },
        include: {
          user: { select: { id: true, nome: true, cognome: true, callsign: true } },
          tappa: true,
        },
      },
    },
  });

  const aperta = evento.status === 'RILASCIATA';
  const guido = macchine.find((m) => m.autistaId === me.id);
  const salito = macchine.find((m) =>
    m.passeggeri.some((p) => p.userId === me.id && p.stato === 'ACCETTATO'),
  );
  const offerte = macchine.filter((m) =>
    m.passeggeri.some((p) => p.userId === me.id && p.stato === 'INVITATO'),
  );
  const richieste = macchine.filter((m) =>
    m.passeggeri.some((p) => p.userId === me.id && p.stato === 'RICHIESTO'),
  );
  const vengo = miaRisposta === 'PRESENTE' || miaRisposta === 'FORSE';
  // posso chiedere un passaggio: vengo, non guido, non ho già un posto
  const possoChiedere = aperta && vengo && !guido && !salito;

  // niente macchine, e non posso metterne: la sezione non serve
  if (macchine.length === 0 && !(aperta && vengo)) return null;

  const link = (id: string) => `/calendario/${evento.id}/viaggio/${id}`;
  // per accettare un «passo a prenderti» con un tocco: consenso già dato e
  // casa nel profilo
  const mieiDati = offerte.some((m) => m.modo === 'PRENDO')
    ? await prisma.user.findUnique({
        where: { id: me.id },
        select: { consensoIndirizzoIl: true, indirizzo: true, cap: true, citta: true },
      })
    : null;
  const daCasa = !!mieiDati?.consensoIndirizzoIl && !!casaDi(mieiDati);
  const mio = salito?.passeggeri.find((p) => p.userId === me.id);

  // i suggerimenti per una macchina nuova: casa mia, e il ritrovo o il campo
  let suggeriti: Parameters<typeof FormMacchina>[0] | null = null;
  if (aperta && vengo && !guido && !salito) {
    const io = await prisma.user.findUnique({
      where: { id: me.id },
      select: { indirizzo: true, cap: true, citta: true },
    });
    const arrivo = arrivoSuggerito(evento);
    suggeriti = {
      arrivoDa: arrivo.cosa,
      giorno: giornoDi(evento.oraRitrovo ?? evento.inizio),
      valori: {
        modo: 'RITROVO',
        posti: null,
        partenza: io ? casaDi(io) || null : null,
        partenzaLat: null,
        partenzaLng: null,
        partenzaOra: null,
        arrivo: arrivo.luogo || null,
        arrivoLat: arrivo.lat,
        arrivoLng: arrivo.lng,
        arrivoOra: arrivo.ora,
        note: null,
      },
    };
  }

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="titolo-sezione flex items-center gap-2">
          <Icona nome="macchina" size={16} /> In macchina
        </p>
        {suggeriti && (
          <BottoneModale
            etichetta="Metto la macchina"
            icona="macchina"
            titolo={`La tua macchina per "${evento.titolo}"`}
            className="btn-primary btn-sm"
            larga
          >
            <FormAzione azione={creaMacchina}>
              <input type="hidden" name="eventId" value={evento.id} />
              <FormMacchina {...suggeriti} />
              <Invia icona="salva">Metto la macchina</Invia>
            </FormAzione>
          </BottoneModale>
        )}
      </div>

      {/* la mia situazione, prima di tutto */}
      {guido && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-nvg/40 bg-nvg/10 px-3 py-2.5 text-sm">
          <span className="flex-1">
            <strong>Guidi tu</strong> ·{' '}
            {guido.passeggeri.filter((p) => p.stato === 'ACCETTATO').length} a bordo
            {guido.posti != null && ` su ${guido.posti}`}
            {guido.passeggeri.some((p) => p.stato === 'INVITATO') &&
              ` · ${guido.passeggeri.filter((p) => p.stato === 'INVITATO').length} da rispondere`}
            {guido.passeggeri.some((p) => p.stato === 'RICHIESTO') && (
              <strong className="text-warn">
                {' '}
                · {guido.passeggeri.filter((p) => p.stato === 'RICHIESTO').length} chiedono un
                passaggio
              </strong>
            )}
          </span>
          <Link href={link(guido.id)} className="btn-primary btn-sm">
            Il viaggio
          </Link>
        </div>
      )}
      {salito && mio && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-nvg/40 bg-nvg/10 px-3 py-2.5 text-sm">
          <span className="min-w-0 flex-1">
            In macchina con <strong>{nomeDi(salito.autista)}</strong>
            {mio.tappa ? (
              <span className="block text-xs text-muted">
                {salito.modo === 'PRENDO' ? 'Ti passa a prendere: ' : 'Ritrovo: '}
                {mio.tappa.nome ?? mio.tappa.luogo}
                {mio.tappa.ora && ` · ore ${fmtTime(mio.tappa.ora)}`}
              </span>
            ) : (
              <span className="block text-xs text-warn">
                {salito.modo === 'PRENDO'
                  ? 'Digli dove passare a prenderti.'
                  : 'Il punto di ritrovo non è ancora deciso.'}
              </span>
            )}
          </span>
          {mio.tappa && meta(mio.tappa.luogo, mio.tappa.lat, mio.tappa.lng) && (
            <a
              href={linkNaviga(meta(mio.tappa.luogo, mio.tappa.lat, mio.tappa.lng)!)}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost btn-sm"
            >
              <Icona nome="naviga" size={14} /> Naviga
            </a>
          )}
          <Link href={link(salito.id)} className="btn-ghost btn-sm">
            Il viaggio
          </Link>
        </div>
      )}
      {!salito &&
        !guido &&
        offerte.map((m) => (
          <div
            key={m.id}
            className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2.5 text-sm"
          >
            <span className="flex-1">
              <strong>{nomeDi(m.autista)}</strong> ti offre un passaggio
              <span className="block text-xs text-muted">{etichettaModo[m.modo]}</span>
            </span>
            {/* si risponde qui: col ritrovo basta un sì; per farsi prendere
                serve dire dove, e quello si fa nella pagina del viaggio */}
            {m.modo === 'RITROVO' || daCasa ? (
              <AzioneBottone
                azione={rispondiPassaggio}
                valori={{ id: m.id, accetta: '1' }}
                icona="approva"
                className="btn-primary btn-sm"
              >
                {m.modo === 'PRENDO' ? 'Salgo, da casa' : 'Salgo'}
              </AzioneBottone>
            ) : (
              <Link href={link(m.id)} className="btn-primary btn-sm">
                Salgo: digli dove
              </Link>
            )}
            <AzioneBottone
              azione={rispondiPassaggio}
              valori={{ id: m.id, accetta: '0' }}
              icona="rifiuta"
              className="btn-ghost btn-sm"
            >
              No, grazie
            </AzioneBottone>
          </div>
        ))}
      {!salito &&
        !guido &&
        richieste.map((m) => (
          <div
            key={m.id}
            className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface2 px-3 py-2.5 text-sm"
          >
            <span className="flex-1">
              Hai chiesto un passaggio a <strong>{nomeDi(m.autista)}</strong>
              <span className="block text-xs text-muted">Aspetta che ti risponda.</span>
            </span>
            <AzioneBottone
              azione={rispondiPassaggio}
              valori={{ id: m.id, accetta: '0' }}
              icona="annulla"
              className="btn-ghost btn-sm"
            >
              Ritira
            </AzioneBottone>
          </div>
        ))}

      {macchine.length === 0 ? (
        <p className="text-sm text-muted">
          Nessuna macchina ancora. Se porti la tua, mettila: poi inviti chi carichi.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {macchine.map((m) => {
            const saliti = m.passeggeri.filter((p) => p.stato === 'ACCETTATO');
            const liberi = m.posti != null ? m.posti - saliti.length : null;
            const coinvolto = m.autistaId === me.id || m.passeggeri.some((p) => p.userId === me.id);
            return (
              <li key={m.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5">
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{nomeDi(m.autista)}</span>
                  <span className="text-xs text-muted"> · {etichettaModo[m.modo]}</span>
                  <span className="block text-xs text-muted">
                    {saliti.length > 0
                      ? `Con ${saliti.map((p) => nomeDi(p.user)).join(', ')}`
                      : 'Ancora nessuno a bordo'}
                  </span>
                </span>
                {liberi != null && (
                  <Badge tono={liberi > 0 ? 'ok' : 'neutro'}>
                    {liberi > 0 ? `${liberi} ${liberi === 1 ? 'posto' : 'posti'}` : 'piena'}
                  </Badge>
                )}
                {(coinvolto || me.admin) && (
                  <Link href={link(m.id)} className="text-xs text-nvg hover:underline">
                    Il viaggio ›
                  </Link>
                )}
                {/* un posto libero lo si chiede, senza aspettare l'invito */}
                {possoChiedere && !coinvolto && (liberi == null || liberi > 0) && (
                  <AzioneBottone
                    azione={chiediPassaggio}
                    valori={{ id: m.id }}
                    icona="macchina"
                    className="btn-ghost btn-sm"
                  >
                    Chiedo un passaggio
                  </AzioneBottone>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
