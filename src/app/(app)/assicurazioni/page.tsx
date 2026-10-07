import { requireUser } from '@/lib/auth';
import { Intestazione, Vuoto } from '@/components/ui';
import { CardAssicurazione } from '@/components/CardAssicurazione';
import { elencoAssicurazioni } from '@/lib/elenco-assicurazioni';
import { infoPolizza } from '@/lib/info-polizza';

export const dynamic = 'force-dynamic';

/**
 * Le mie assicurazioni: la polizza giornaliera di chi gioca da ospite, con i
 * numeri da dare se succede qualcosa in campo. In cima quelle che valgono
 * adesso (oggi, o per un giorno che deve venire); sotto lo storico.
 */
export default async function MieAssicurazioniPage() {
  const me = await requireUser();
  const [tutte, info] = await Promise.all([elencoAssicurazioni({ userId: me.id }), infoPolizza()]);
  const valide = tutte.filter((a) => a.valida).reverse();
  const storico = tutte.filter((a) => !a.valida);
  return (
    <>
      <Intestazione
        titolo="Mie assicurazioni"
        sottotitolo="La polizza giornaliera che ti copre quando giochi: tienila a portata di mano in campo"
      />
      {tutte.length === 0 ? (
        <Vuoto testo="Non hai ancora assicurazioni: si attivano quando ti segni a un’attività e la paghi." />
      ) : (
        <div className="space-y-8">
          <section>
            <p className="titolo-sezione mb-3">Valide</p>
            {valide.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {valide.map((a) => (
                  <CardAssicurazione key={a.id} a={a} info={info} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Nessuna assicurazione valida adesso.</p>
            )}
          </section>
          {storico.length > 0 && (
            <section>
              <p className="titolo-sezione mb-3">Storico</p>
              <div className="grid gap-4 md:grid-cols-2">
                {storico.map((a) => (
                  <CardAssicurazione key={a.id} a={a} info={info} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
