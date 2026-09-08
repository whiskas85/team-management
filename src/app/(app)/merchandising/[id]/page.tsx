import { SchedaAnnuncio } from '@/components/SchedaAnnuncio';

export const dynamic = 'force-dynamic';

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchedaAnnuncio id={id} da="merchandising" />;
}
