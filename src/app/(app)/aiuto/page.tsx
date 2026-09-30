import { requireUser } from '@/lib/auth';
import { Intestazione } from '@/components/ui';
import { AiutoGenerale } from '@/components/AiutoGenerale';

/**
 * L'aiuto generale: tutte le pagine spiegate, con la ricerca. Ogni pagina ha
 * anche il suo «?» accanto al titolo, che apre solo la sua voce.
 */
export default async function AiutoPage() {
  await requireUser();
  return (
    <>
      <Intestazione
        titolo="Aiuto"
        sottotitolo="Cosa si fa in ogni pagina, e come. Il «?» accanto al titolo di ogni pagina apre la sua spiegazione; questa pagina è nel riquadro del tuo nome, in alto a destra."
      />
      <AiutoGenerale />
    </>
  );
}
