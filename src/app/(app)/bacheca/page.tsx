import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtDateTime } from '@/lib/format';
import { etichettaPubblico, filtroBacheche, puoCreareBacheche } from '@/lib/bacheche';
import { personeSceglibili } from '@/lib/bacheche-persone';
import { Badge, Intestazione, Vuoto } from '@/components/ui';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { segnaTutteLette } from '@/actions/bacheche';
import { FormBacheca } from '@/components/FormBacheca';
import { Icona } from '@/components/Icona';
import { iconaBacheca } from '@/lib/icone-bacheca';

export const dynamic = 'force-dynamic';

/**
 * Le bacheche che riguardano chi guarda.
 *
 * Ognuna con quanti messaggi aspettano di essere letti e quando è stato
 * scritto l'ultimo: è quello che si guarda entrando, per sapere dove andare.
 * Chi non la vede non sa nemmeno che esiste — una bacheca del direttivo
 * elencata a tutti con il lucchetto sarebbe già una notizia.
 */
export default async function BachechePage() {
  const me = await requireUser();

  const bacheche = await prisma.bacheca.findMany({
    where: filtroBacheche(me),
    orderBy: [{ ordine: 'asc' }, { creataIl: 'asc' }],
    include: {
      messaggi: {
        where: { pubblicatoIl: { not: null } },
        orderBy: { pubblicatoIl: 'desc' },
        take: 1,
        select: { pubblicatoIl: true, titolo: true },
      },
      _count: { select: { messaggi: { where: { pubblicatoIl: null } } } },
    },
  });

  const daLeggere = await prisma.consegnaBacheca.groupBy({
    by: ['messaggioId'],
    where: { userId: me.id, lettaIl: null, messaggio: { bachecaId: { in: bacheche.map((b) => b.id) } } },
  });
  const perBacheca = new Map<string, number>();
  if (daLeggere.length) {
    const messaggi = await prisma.messaggioBacheca.findMany({
      where: { id: { in: daLeggere.map((d) => d.messaggioId) } },
      select: { bachecaId: true },
    });
    for (const m of messaggi) perBacheca.set(m.bachecaId, (perBacheca.get(m.bachecaId) ?? 0) + 1);
  }

  const crea = puoCreareBacheche(me.roles);

  return (
    <>
      <Intestazione
        titolo="Bacheca"
        sottotitolo="Le comunicazioni che restano: si sa quando sono uscite e chi le ha lette"
        azioni={
          daLeggere.length > 0 || crea ? (
            <>
              {/* per chi torna dopo giorni: spegne tutti i pallini senza
                  aprire le bacheche una a una */}
              {daLeggere.length > 0 && (
                <AzioneBottone azione={segnaTutteLette} valori={{}} icona="concludi">
                  Leggi tutto
                </AzioneBottone>
              )}
              {crea && (
                <BottoneModale etichetta="Nuova bacheca" icona="aggiungi" titolo="Nuova bacheca" larga>
                  <FormBacheca persone={await personeSceglibili()} moderatorePredefinito={me.id} />
                </BottoneModale>
              )}
            </>
          ) : undefined
        }
      />

      {bacheche.length === 0 ? (
        <Vuoto
          testo={
            crea
              ? 'Nessuna bacheca ancora. Creane una: «Comunicazioni» per la squadra è un buon inizio.'
              : 'Per ora non c’è nessuna bacheca per te.'
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bacheche.map((b) => {
            const nuovi = perBacheca.get(b.id) ?? 0;
            const ultimo = b.messaggi[0];
            return (
              <Link key={b.id} href={`/bacheca/${b.id}`} className="card block transition-colors hover:border-nvgdim">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 break-words font-medium">
                      <Icona nome={iconaBacheca(b.icona)} size={16} /> {b.nome}
                    </h3>
                    {b.descrizione && <p className="mt-0.5 text-xs text-muted">{b.descrizione}</p>}
                  </div>
                  {nuovi > 0 && (
                    <span className="num shrink-0 rounded-full bg-nvg px-2 py-0.5 text-xs font-semibold text-bg">
                      {nuovi}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Badge tono="neutro">{etichettaPubblico[b.pubblico]}</Badge>
                  <span className="num">
                    {ultimo?.pubblicatoIl ? `ultimo messaggio ${fmtDateTime(ultimo.pubblicatoIl)}` : 'nessun messaggio'}
                  </span>
                  {b._count.messaggi > 0 && crea && (
                    <span className="text-warn">
                      {b._count.messaggi} {b._count.messaggi === 1 ? 'bozza' : 'bozze'}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
