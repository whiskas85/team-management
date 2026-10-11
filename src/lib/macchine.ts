import { prisma } from './db';
import { isAdmin } from './domain';
import { nomeCompleto } from './format';
import type { Role } from '@prisma/client';

/**
 * Le macchinate, lato lettura: chi è chi in una macchina, e cosa può vedere.
 *
 * **Gli indirizzi si vedono il meno possibile.** La partenza dell'autista è
 * casa sua: la vede solo lui. La tappa di un passeggero nel modo «passo a
 * prenderli» è quasi sempre casa sua: la vedono lui e l'autista, gli altri
 * passeggeri solo il nome. I punti di ritrovo invece sono di tutti quelli a
 * bordo, perché sono posti dove ci si trova.
 */

export type RuoloMacchina = 'autista' | 'passeggero' | 'invitato' | 'richiesto' | 'admin';

export const includeMacchina = {
  event: {
    select: {
      id: true,
      titolo: true,
      status: true,
      inizio: true,
      fine: true,
      ritrovo: true,
      ritrovoNome: true,
      ritrovoLat: true,
      ritrovoLng: true,
      oraRitrovo: true,
      luogo: true,
      luogoLat: true,
      luogoLng: true,
      field: { select: { nome: true, indirizzo: true, citta: true, lat: true, lng: true } },
    },
  },
  autista: { select: { id: true, nome: true, cognome: true, callsign: true, telefono: true } },
  passeggeri: {
    orderBy: { invitatoIl: 'asc' as const },
    include: {
      user: { select: { id: true, nome: true, cognome: true, callsign: true, telefono: true } },
    },
  },
  tappe: { orderBy: { ordine: 'asc' as const } },
  spese: {
    orderBy: { createdAt: 'asc' as const },
    include: { user: { select: { id: true, nome: true, cognome: true, callsign: true } } },
  },
};

export async function caricaMacchina(id: string) {
  return prisma.macchina.findUnique({ where: { id }, include: includeMacchina });
}

export type MacchinaCompleta = NonNullable<Awaited<ReturnType<typeof caricaMacchina>>>;

/** Chi sono io in questa macchina. Nullo: non c'entro, e non la vedo. */
export function ruoloIn(
  m: Pick<MacchinaCompleta, 'autistaId' | 'passeggeri' | 'pubblica'>,
  me: { id: string; roles: Role[] },
): RuoloMacchina | null {
  if (m.autistaId === me.id) return 'autista';
  const io = m.passeggeri.find((p) => p.userId === me.id);
  if (io?.stato === 'ACCETTATO') return 'passeggero';
  if (io?.stato === 'INVITATO') return 'invitato';
  if (io?.stato === 'RICHIESTO') return 'richiesto';
  // una macchina privata non la vede nemmeno l'admin: è un affare di chi ci sale
  if (m.pubblica && isAdmin(me.roles)) return 'admin';
  return null;
}

/** Quelli a bordo: l'autista e chi ha accettato. */
export const aBordo = (m: Pick<MacchinaCompleta, 'autistaId' | 'passeggeri'>) => [
  m.autistaId,
  ...m.passeggeri.filter((p) => p.stato === 'ACCETTATO').map((p) => p.userId),
];

/**
 * L'arrivo suggerito per una macchina nuova: il ritrovo dell'attività, con la
 * sua ora, se c'è; altrimenti il parcheggio del campo (o il luogo scritto),
 * con l'ora d'inizio.
 */
export function arrivoSuggerito(
  e: Pick<
    MacchinaCompleta['event'],
    | 'inizio'
    | 'ritrovo'
    | 'ritrovoLat'
    | 'ritrovoLng'
    | 'oraRitrovo'
    | 'luogo'
    | 'luogoLat'
    | 'luogoLng'
    | 'field'
  >,
) {
  if (e.ritrovo || e.ritrovoLat != null) {
    return {
      luogo: e.ritrovo ?? 'Ritrovo',
      lat: e.ritrovoLat,
      lng: e.ritrovoLng,
      ora: e.oraRitrovo ?? e.inizio,
      cosa: 'il ritrovo dell’attività',
    };
  }
  if (e.field) {
    return {
      luogo: [e.field.nome, e.field.indirizzo, e.field.citta].filter(Boolean).join(', '),
      lat: e.field.lat,
      lng: e.field.lng,
      ora: e.inizio,
      cosa: 'il parcheggio del campo',
    };
  }
  if (e.luogo) {
    return {
      luogo: e.luogo,
      lat: e.luogoLat,
      lng: e.luogoLng,
      ora: e.inizio,
      cosa: 'il luogo dell’attività',
    };
  }
  return { luogo: '', lat: null, lng: null, ora: e.inizio, cosa: null };
}

/** L'indirizzo di casa dal profilo, come lo si scriverebbe sul navigatore. */
export const casaDi = (u: { indirizzo: string | null; cap: string | null; citta: string | null }) =>
  [u.indirizzo, [u.cap, u.citta].filter(Boolean).join(' ')].filter(Boolean).join(', ');

/** Come si dice un punto a Google Maps: le coordinate se ci sono, se no il testo. */
export const meta = (luogo: string | null, lat: number | null, lng: number | null) =>
  lat != null && lng != null ? `${lat},${lng}` : luogo?.trim() || null;

export const nomeDi = (u: { nome: string; cognome: string; callsign: string | null }) =>
  u.callsign || nomeCompleto(u);

/**
 * Chi proporre come passeggero, in ordine: prima quelli che l'autista ha
 * portato più volte, poi chi all'attività viene, poi chi forse, poi gli altri.
 */
export async function propostePasseggeri(eventId: string, autistaId: string, macchinaId: string) {
  const [persone, risposte, portati, occupati] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { not: autistaId },
        OR: [
          { stato: 'SQUADRA' },
          { rsvps: { some: { eventId, status: { in: ['PRESENTE', 'FORSE'] } } } },
        ],
      },
      select: { id: true, nome: true, cognome: true, callsign: true },
    }),
    prisma.eventRsvp.findMany({ where: { eventId }, select: { userId: true, status: true } }),
    // quante volte l'ho portato, in tutte le macchine che ho guidato
    prisma.passeggeroMacchina.groupBy({
      by: ['userId'],
      where: { stato: 'ACCETTATO', macchina: { autistaId, id: { not: macchinaId } } },
      _count: { _all: true },
    }),
    // chi ha già un posto (o guida) per questa attività
    prisma.macchina.findMany({
      where: { eventId, id: { not: macchinaId } },
      select: {
        pubblica: true,
        autista: { select: { id: true, nome: true, cognome: true, callsign: true } },
        passeggeri: { where: { stato: 'ACCETTATO' }, select: { userId: true } },
      },
    }),
  ]);

  const volte = new Map(portati.map((p) => [p.userId, p._count._all]));
  const stato = new Map(risposte.map((r) => [r.userId, r.status]));
  const giaCon = new Map<string, string>();
  // di una macchina privata non si dice con chi: solo che il posto c'è già
  for (const m of occupati) {
    giaCon.set(m.autista.id, 'porta la sua macchina');
    for (const p of m.passeggeri) {
      giaCon.set(
        p.userId,
        m.pubblica ? `in macchina con ${nomeDi(m.autista)}` : 'ha già un passaggio',
      );
    }
  }
  const peso = (s: string | undefined) => (s === 'PRESENTE' ? 0 : s === 'FORSE' ? 1 : s ? 3 : 2);

  return persone
    .filter((p) => stato.get(p.id) !== 'ASSENTE')
    .map((p) => {
      const v = volte.get(p.id) ?? 0;
      const s = stato.get(p.id);
      const note = [
        v > 0 ? `l’hai portato ${v === 1 ? 'una volta' : `${v} volte`}` : null,
        s === 'PRESENTE' ? 'viene' : s === 'FORSE' ? 'forse' : 'non ha risposto',
        giaCon.get(p.id) ?? null,
      ].filter(Boolean);
      return {
        id: p.id,
        nome: nomeCompleto(p),
        sotto: note.join(' · '),
        v,
        s,
        occupato: giaCon.has(p.id),
      };
    })
    .sort(
      (a, b) =>
        Number(a.occupato) - Number(b.occupato) ||
        b.v - a.v ||
        peso(a.s) - peso(b.s) ||
        a.nome.localeCompare(b.nome),
    );
}

/**
 * Dimentica gli indirizzi dei viaggi finiti da una settimana: la partenza
 * dell'autista e i punti dove si è passati a prendere qualcuno. I nomi, i
 * ritrovi e i conti restano.
 */
export async function dimenticaIndirizziViaggi(adesso = new Date()) {
  const soglia = new Date(adesso.getTime() - 7 * 86_400_000);
  const finite = {
    event: { OR: [{ fine: { lt: soglia } }, { fine: null, inizio: { lt: soglia } }] },
  };
  const [partenze, tappe] = await Promise.all([
    prisma.macchina.updateMany({
      where: { ...finite, OR: [{ partenza: { not: null } }, { partenzaLat: { not: null } }] },
      data: { partenza: null, partenzaLat: null, partenzaLng: null },
    }),
    prisma.tappaMacchina.updateMany({
      where: { macchina: { ...finite, modo: 'PRENDO' }, lat: { not: null } },
      data: { luogo: 'Indirizzo cancellato', lat: null, lng: null },
    }),
  ]);
  // anche le tappe scritte senza coordinate
  const senza = await prisma.tappaMacchina.updateMany({
    where: { macchina: { ...finite, modo: 'PRENDO' }, luogo: { not: 'Indirizzo cancellato' } },
    data: { luogo: 'Indirizzo cancellato' },
  });
  return partenze.count + tappe.count + senza.count;
}
