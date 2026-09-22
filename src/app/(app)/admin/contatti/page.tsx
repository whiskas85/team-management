import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoVedereNuovi } from '@/lib/domain';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { etaCompiuta } from '@/lib/messaggi';
import { urlTelefono, urlWhatsapp } from '@/lib/contatti';
import { Badge, Campo, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { BottoneModale } from '@/components/Modale';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { BottoneElimina, CardRiga } from '@/components/CardRiga';
import { BottoneCreaOperatore } from '@/components/FormOperatore';
import { Icona } from '@/components/Icona';
import { aggiungiContatto, salvaNotaContatto, scartaContatto } from '@/actions/contatti';

export const dynamic = 'force-dynamic';

/**
 * Una data nel formato del campo, AAAA-MM-GG, **coi giorni di qui**.
 *
 * La data di nascita è salvata a mezzanotte ora italiana: passarla da
 * `toISOString` la porterebbe in UTC, cioè alle dieci di sera del giorno
 * prima, e il modulo si aprirebbe con un giorno in meno.
 */
const perCampoData = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * I contatti: chi chiamare, prima che diventi un nuovo.
 *
 * Il gradino prima dei nuovi. Qui ci sono persone che ci hanno lasciato un
 * numero — dal sito, o a voce — e con cui nessuno ha ancora parlato davvero.
 * Non hanno un account: sono un nome, un telefono e la nota della telefonata.
 * Da qui si esce in due modi: **nuovo**, e il percorso è quello di sempre, o
 * **scartato**, e i dati spariscono.
 *
 * In cima chi nessuno ha ancora chiamato, dal più vecchio: è quello che
 * aspetta da più tempo, e un contatto richiamato dopo due settimane è un
 * contatto che ha già trovato un'altra squadra.
 */
export default async function ContattiPage() {
  await requirePermesso(puoVedereNuovi);

  const contatti = await prisma.contatto.findMany({
    orderBy: [{ chiamatoIl: { sort: 'asc', nulls: 'first' } }, { creatoIl: 'asc' }],
    include: { creatoDa: { select: { nome: true, cognome: true, callsign: true } } },
  });

  const daChiamare = contatti.filter((c) => !c.chiamatoIl).length;
  const dalSito = contatti.filter((c) => c.origine === 'SITO').length;

  return (
    <>
      <Intestazione
        titolo="Contatti"
        sottotitolo="Chi chiamare, prima che diventi un nuovo"
        azioni={
          <BottoneModale etichetta="Aggiungi contatto" icona="aggiungi" titolo="Nuovo contatto">
            <FormAzione azione={aggiungiContatto}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Nome *">
                  <input name="nome" required className="input" />
                </Campo>
                <Campo label="Cognome">
                  <input name="cognome" className="input" />
                </Campo>
                <Campo label="Telefono *">
                  <input name="telefono" required className="input" inputMode="tel" />
                </Campo>
                <Campo label="Email">
                  <input name="email" type="email" className="input" />
                </Campo>
                <Campo label="Data di nascita">
                  <input name="dataNascita" type="date" className="input" />
                </Campo>
                <Campo label="Zona">
                  <input name="zona" className="input" placeholder="Da dove viene" />
                </Campo>
                <Campo label="Come ci ha conosciuto">
                  <input name="come" className="input" placeholder="Passaparola, Instagram…" />
                </Campo>
              </div>
              <Campo label="Nota">
                <textarea name="nota" rows={3} className="input" />
              </Campo>
              <Invia icona="aggiungi">Aggiungi</Invia>
            </FormAzione>
          </BottoneModale>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Statistica etichetta="Da chiamare" valore={daChiamare} tono={daChiamare ? 'warn' : 'ok'} />
        <Statistica etichetta="In tutto" valore={contatti.length} />
        <Statistica etichetta="Dal sito" valore={dalSito} />
      </div>

      {contatti.length === 0 ? (
        <Vuoto testo="Nessun contatto da chiamare. Quelli che arrivano dal sito compaiono qui, e ti arriva una notifica." />
      ) : (
        <div className="space-y-3">
          {contatti.map((c) => {
            const tel = urlTelefono(c.telefono);
            const wa = urlWhatsapp(c.telefono, `Ciao ${c.nome}, sono di Zero Dark Team: ci hai scritto dal sito.`);
            return (
              <CardRiga
                key={c.id}
                card
                titolo={
                  <span className="flex flex-wrap items-center gap-2">
                    {c.nome} {c.cognome}
                    {c.chiamatoIl ? (
                      <Badge tono="info">chiamato {fmtDateTime(c.chiamatoIl)}</Badge>
                    ) : (
                      <Badge tono="warn">da chiamare</Badge>
                    )}
                  </span>
                }
                sottotitolo={
                  <span className="num">
                    {c.origine === 'SITO' ? 'dal sito' : `scritto da ${c.creatoDa?.callsign ?? c.creatoDa?.nome ?? '—'}`}{' '}
                    · {fmtDateTime(c.creatoIl)}
                    {c.dataNascita && ` · nato il ${fmtDate(c.dataNascita)} (${etaCompiuta(c.dataNascita)} anni)`}
                    {c.zona && ` · ${c.zona}`}
                    {c.comeCiHaConosciuto && ` · ${c.comeCiHaConosciuto}`}
                  </span>
                }
                elimina={
                  <BottoneElimina
                    azione={scartaContatto}
                    valori={{ id: c.id }}
                    conferma={`Scartare ${c.nome}? I suoi dati vengono cancellati del tutto.`}
                    etichetta={`Scarta ${c.nome}`}
                  />
                }
                azioni={
                  <BottoneCreaOperatore
                    stato="NUOVO"
                    etichetta="Diventa un nuovo"
                    className="btn-primary btn-sm"
                    contatto={{
                      id: c.id,
                      nome: c.nome,
                      cognome: c.cognome,
                      email: c.email,
                      telefono: c.telefono,
                      dataNascita: c.dataNascita ? perCampoData(c.dataNascita) : null,
                    }}
                  />
                }
              >
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  {tel && (
                    <a href={tel} className="btn-ghost btn-sm">
                      <Icona nome="telefono" size={15} /> {c.telefono}
                    </a>
                  )}
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                      <Icona nome="whatsapp" size={15} /> WhatsApp
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="btn-ghost btn-sm">
                      <Icona nome="email" size={15} /> {c.email}
                    </a>
                  )}
                </div>

                {c.messaggio && (
                  <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface2 px-3 py-2 text-sm text-ink/90">
                    {c.messaggio}
                  </p>
                )}

                <FormAzione azione={salvaNotaContatto} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={c.id} />
                  <textarea
                    name="nota"
                    rows={2}
                    defaultValue={c.nota ?? ''}
                    className="input text-sm"
                    placeholder="Com'è andata la telefonata: quando può venire, cosa gli interessa…"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input type="checkbox" name="chiamato" defaultChecked={!c.chiamatoIl} /> segna che l’ho
                      chiamato adesso
                    </label>
                    <Invia icona="salva" className="btn-ghost btn-sm">
                      Salva la nota
                    </Invia>
                  </div>
                </FormAzione>
              </CardRiga>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Scartare cancella i dati: di chi non è mai entrato non si tiene niente. Chi diventa un nuovo
        esce da qui e compare fra i <strong className="text-ink">Nuovi</strong>.
      </p>
    </>
  );
}
