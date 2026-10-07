import { requirePermesso } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { prisma } from '@/lib/db';
import { Intestazione } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { EditoreMarkdown } from '@/components/EditoreMarkdown';
import { salvaInfoPolizza } from '@/actions/assicurazione';
import { TESTO_INFO_POLIZZA } from '@/lib/info-polizza';

export const dynamic = 'force-dynamic';

/**
 * Massimali e franchigie della polizza prova FIGT. Si scrivono qui, in
 * Markdown, e chi è assicurato li legge dentro la sua polizza («Cosa copre»),
 * in sola lettura. Svuotato, torna il testo di serie.
 */
export default async function InfoPolizzaPage() {
  await requirePermesso(isAdmin);
  const imp = await prisma.impostazioni.findUnique({
    where: { id: 'app' },
    select: { infoPolizzaProva: true },
  });
  const testo = imp?.infoPolizzaProva?.trim() || TESTO_INFO_POLIZZA;
  return (
    <>
      <Intestazione
        titolo="Info polizza"
        sottotitolo="Massimali e franchigie della polizza prova: si leggono dentro ogni polizza, in «Cosa copre»"
      />
      <div className="card">
        <FormAzione azione={salvaInfoPolizza} restaAperto>
          <EditoreMarkdown nome="testo" valore={testo} righe={22} />
          <p className="text-xs text-muted">
            Quando la federazione cambia le condizioni, aggiornale qui: le vedono subito tutti gli
            assicurati. Svuotando il testo torna quello di serie.
          </p>
          <Invia icona="salva">Salva</Invia>
        </FormAzione>
      </div>
    </>
  );
}
