import { requireUser } from '@/lib/auth';
import { Bacheca } from '@/components/Bacheca';

export const dynamic = 'force-dynamic';

/**
 * L'usato fra soci: quello che uno non usa più e passa a un compagno.
 *
 * Qui il gestionale **non tocca i soldi**: ci si scrive, ci si accorda, ci si
 * vede al campo. Il merchandising del team sta nella sua pagina proprio perché
 * lì i soldi finiscono in cassa, ed è una cosa diversa che merita un posto suo.
 */
export default async function MercatinoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; solo?: string }>;
}) {
  const me = await requireUser();
  const { q, solo } = await searchParams;

  return (
    <Bacheca
      me={me}
      ufficiale={false}
      titolo="Mercatino"
      sottotitolo="Quello che la squadra vende, passa di mano fra soci"
      cerca={(q ?? '').trim()}
      soloDisponibili={solo === 'disponibili'}
      azione="/mercatino"
    />
  );
}
