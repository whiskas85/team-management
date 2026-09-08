import { requireUser } from '@/lib/auth';
import { regolamentoDaAccettare } from '@/lib/documenti';
import { MuroRegolamento } from '@/components/MuroRegolamento';

export const dynamic = 'force-dynamic';

/**
 * Prima le regole, poi la bacheca.
 *
 * Il controllo sta nel layout e non in ogni pagina: così vale anche per la
 * scheda di un annuncio aperta da un link, che è proprio il modo in cui uno
 * ci arriva la prima volta senza passare dall’elenco.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const dovuto = await regolamentoDaAccettare(me.id);
  return dovuto ? <MuroRegolamento dovuto={dovuto} /> : <>{children}</>;
}
