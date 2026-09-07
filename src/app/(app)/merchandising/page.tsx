import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { puoVedereMerchandising } from '@/lib/mercatino';
import { Bacheca } from '@/components/Bacheca';

export const dynamic = 'force-dynamic';

/**
 * Il merchandising del team: magliette, mimetiche, quello che la squadra fa
 * fare e rivende ai suoi.
 *
 * Sta in una pagina sua e non in una linguetta del mercatino perché è una cosa
 * diversa, non un filtro: qui vende **il team**, il catalogo lo apre solo
 * l'admin, e quello che si ordina finisce nella cassa della squadra. Il
 * mercatino invece è roba che passa di mano fra soci, e il gestionale non
 * c'entra con i loro soldi.
 */
export default async function MerchandisingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; solo?: string }>;
}) {
  const me = await requireUser();
  // la voce di menu non compare, ma la pagina non si fida del menu
  if (!puoVedereMerchandising(me.stato)) redirect('/mercatino');
  const { q, solo } = await searchParams;

  return (
    <Bacheca
      me={me}
      ufficiale
      titolo="Merchandising"
      sottotitolo="Quello che il team fa fare: magliette, mimetiche, materiale di squadra"
      cerca={(q ?? '').trim()}
      soloDisponibili={solo === 'disponibili'}
      azione="/merchandising"
    />
  );
}
