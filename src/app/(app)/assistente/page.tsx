import { headers } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtDate, fmtDateTime, nomeCompleto } from '@/lib/format';
import { elencoLeggibile } from '@/lib/mcp/strumenti';
import { etichettaRuolo } from '@/lib/domain';
import { Badge, Campo, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { creaChiaveMcp, revocaChiaveMcp } from '@/actions/mcp';

export const dynamic = 'force-dynamic';

/**
 * Le chiavi con cui un assistente lavora al posto tuo.
 *
 * La pagina è di tutti, non solo dell'admin: una chiave non dà poteri, li
 * eredita. Chi è atleta collega un assistente che vede il calendario e risponde
 * alle attività; chi tiene la segreteria ne collega uno che vede anche le
 * quote. Per questo l'elenco degli strumenti qui sotto è calcolato sui ruoli di
 * chi guarda: è la risposta onesta alla domanda "cosa gli sto dando".
 */
export default async function AssistentePage() {
  const me = await requireUser();

  const intestazioni = await headers();
  const host = intestazioni.get('host');
  const indirizzo = host
    ? `${intestazioni.get('x-forwarded-proto') ?? 'http'}://${host}`
    : undefined;

  const chiavi = await prisma.tokenMcp.findMany({
    where: { userId: me.id, revocatoIl: null },
    orderBy: { creatoIl: 'desc' },
  });

  const strumenti = elencoLeggibile(me);
  const scrivono = strumenti.filter((s) => s.scrive);

  return (
    <>
      <Intestazione
        titolo="Assistente"
        sottotitolo="Collega un assistente al gestionale: farà quello che potresti fare tu, e nient’altro"
        azioni={
          <BottoneModale etichetta="Nuova chiave" icona="chiave" titolo="Nuova chiave" larga>
            <FormAzione azione={creaChiaveMcp} indirizzo={indirizzo} restaAperto>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Come la chiami">
                  <input
                    name="nome"
                    className="input"
                    placeholder="Claude sul portatile"
                    maxLength={60}
                  />
                </Campo>
                <Campo label="Scade fra (giorni)">
                  <input
                    name="giorni"
                    type="number"
                    min={1}
                    max={730}
                    className="input"
                    placeholder="vuoto = non scade"
                  />
                </Campo>
              </div>
              <Invia icona="chiave">Crea la chiave</Invia>
            </FormAzione>
          </BottoneModale>
        }
      />

      <div className="mb-6 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
        Una chiave <strong>è come la tua password</strong>: chi ce l’ha lavora a nome tuo, e quello
        che fa risulta fatto da te. Non passarla a nessuno, e se un computer non è più tuo revoca
        la chiave che ci gira sopra invece di cambiarla.
      </div>

      {/* ---------------------------------------------------- le mie chiavi */}
      <div className="card mb-6">
        <p className="titolo-sezione mb-3">Le tue chiavi</p>

        {chiavi.length === 0 ? (
          <Vuoto testo="Nessuna chiave attiva. Finché non ne crei una, nessun assistente entra." />
        ) : (
          <div className="space-y-2">
            {chiavi.map((c) => {
              const scaduta = c.scadeIl != null && c.scadeIl < new Date();
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface px-3 py-2"
                >
                  <span className="font-medium">{c.nome}</span>
                  <code className="num rounded bg-surface2 px-1.5 py-0.5 text-[11px] text-muted">
                    {c.prefisso}…
                  </code>
                  {scaduta && <Badge tono="danger">scaduta</Badge>}
                  <span className="num text-[11px] text-muted">
                    creata {fmtDate(c.creatoIl)}
                    {c.scadeIl ? ` · scade ${fmtDate(c.scadeIl)}` : ''}
                    {c.ultimoUsoIl ? ` · usata ${fmtDateTime(c.ultimoUsoIl)}` : ' · mai usata'}
                  </span>
                  <span className="ml-auto">
                    <AzioneBottone
                      azione={revocaChiaveMcp}
                      valori={{ id: c.id }}
                      icona="elimina"
                      conferma="Revocare questa chiave? L’assistente che la usa smetterà subito di funzionare."
                      className="btn-danger btn-sm"
                    >
                      Revoca
                    </AzioneBottone>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- come si collega */}
      <div className="card mb-6">
        <p className="titolo-sezione mb-2">Come si collega</p>
        <p className="mb-3 text-sm text-muted">
          Quando crei una chiave trovi già il comando pronto da copiare. In alternativa, l’indirizzo
          da dare a mano a un assistente che parla MCP è questo, con la chiave nell’intestazione{' '}
          <code className="num text-ink">Authorization: Bearer</code>:
        </p>
        <code className="num block select-all break-all rounded bg-surface2 px-3 py-2 text-sm text-ink">
          {indirizzo ?? 'https://il-tuo-indirizzo'}/api/mcp
        </code>
        <p className="mt-2 text-[11px] text-muted">
          Serve che il computer dell’assistente arrivi a questo indirizzo: dentro ZeroTier funziona,
          da fuori no.
        </p>
      </div>

      {/* ---------------------------------------------------- cosa può fare */}
      <div className="card">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <p className="titolo-sezione">Cosa potrà fare</p>
          <span className="text-[11px] text-muted">
            {nomeCompleto(me)} ·{' '}
            {me.roles.length > 0 ? me.roles.map((r) => etichettaRuolo[r]).join(' · ') : 'nessun ruolo'}
          </span>
        </div>
        <p className="mb-3 text-xs text-muted">
          Questo elenco è calcolato sui tuoi ruoli adesso. Se domani ne guadagni o ne perdi uno, le
          chiavi che hai già cambiano con te: non c’è un secondo elenco di permessi da tenere
          allineato. {scrivono.length > 0 && (
            <>
              Le voci in <span className="text-warn">ambra</span> modificano i dati.
            </>
          )}
        </p>

        <div className="space-y-1.5">
          {strumenti.map((s) => (
            <div key={s.nome} className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <code className={`num text-xs ${s.scrive ? 'text-warn' : 'text-nvg'}`}>{s.nome}</code>
              <span className="min-w-0 flex-1 text-muted">{s.descrizione}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
