import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { vedeAttivitaSquadra } from '@/lib/domain';
import { primoIban, primoLink } from '@/lib/link';
import { salvaMetodoPersonale } from '@/actions/metodi-personali';
import { Campo, Intestazione } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';

export const dynamic = 'force-dynamic';

/** Il nome del metodo, indovinato dal link: si cambia comunque nel modulo. */
function nomeDa(link: string | null, iban: string | null): string {
  if (link) {
    const host = new URL(link).hostname.replace(/^www\./, '');
    if (host.includes('paypal')) return 'PayPal';
    if (host.includes('satispay')) return 'Satispay';
    if (host.includes('revolut')) return 'Revolut';
    if (host.includes('wise')) return 'Wise';
    if (host.includes('hype')) return 'Hype';
  }
  if (iban) return 'Bonifico';
  return '';
}

/**
 * Dove arriva quello che si condivide al gestionale dal menu «Condividi» del
 * telefono (manifest: share_target). Il link di PayPal, il profilo Satispay,
 * l'IBAN copiato dalla banca: diventano un metodo per essere pagati, con il
 * modulo già compilato. Si controlla e si salva.
 */
export default async function CondividiPage({
  searchParams,
}: {
  searchParams: Promise<{ titolo?: string; testo?: string; link?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;
  // ogni app mette il link dove vuole: nel campo apposta, nel testo, nel titolo
  const tutto = [sp.link, sp.testo, sp.titolo].filter(Boolean).join(' ').trim();
  const link = primoLink(tutto);
  const iban = primoIban(tutto);
  // il testo da salvare: quello condiviso, col link in coda se è arrivato a parte
  const testo = [sp.testo, sp.link && !sp.testo?.includes(sp.link) ? sp.link : null]
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!vedeAttivitaSquadra(me.stato)) {
    return (
      <>
        <Intestazione titolo="Condividi" />
        <p className="card text-sm text-muted">
          I metodi per essere pagati sono per gli operatori della squadra.
        </p>
      </>
    );
  }

  return (
    <>
      <Intestazione
        titolo="Nuovo metodo per essere pagato"
        sottotitolo="Da quello che hai condiviso: controlla e salva"
      />
      <div className="card max-w-xl">
        {!tutto ? (
          <p className="text-sm text-muted">
            Non è arrivato niente. Dall’app di PayPal, Satispay o della banca usa «Condividi» e
            scegli questa app: il link o l’IBAN arrivano qui.
          </p>
        ) : (
          <FormAzione azione={salvaMetodoPersonale} className="space-y-4">
            <Campo label="Nome *" span>
              <input
                name="nome"
                required
                maxLength={40}
                defaultValue={nomeDa(link, iban)}
                className="input"
                placeholder="Bonifico, PayPal, Satispay…"
              />
            </Campo>
            <Campo label="Come pagarti *" span>
              <textarea
                name="istruzioni"
                required
                rows={4}
                maxLength={500}
                defaultValue={testo || tutto}
                className="input"
              />
              <span className="mt-1 block text-[11px] text-muted">
                {link
                  ? 'Il link diventa il pulsante «Paga» per chi ti paga dalla cassa.'
                  : iban
                    ? 'L’IBAN diventa il pulsante «Copia IBAN».'
                    : 'Non ho trovato un link o un IBAN: controlla il testo.'}
              </span>
            </Campo>
            <Invia icona="salva">Aggiungi ai miei metodi</Invia>
          </FormAzione>
        )}
        <p className="mt-4 text-xs text-muted">
          I tuoi metodi li trovi nel <Link href="/profilo" className="text-nvg hover:underline">profilo</Link>,
          in «Come essere pagato».
        </p>
      </div>
    </>
  );
}
