import { Badge, Campo } from '@/components/ui';
import { AllegatoObbligatorioCampi } from '@/components/AllegatoObbligatorioCampi';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { BottoneElimina, CardRiga } from '@/components/CardRiga';
import { eliminaMetodo, ordinaMetodi, salvaMetodo } from '@/actions/metodi';
import { ElencoOrdinabile } from '@/components/ElencoOrdinabile';
import { CardRichiudibile } from '@/components/CardRichiudibile';

export type MetodoCassa = {
  id: string;
  nome: string;
  descrizione: string | null;
  istruzioni: string | null;
  selfService: boolean;
  esterni: boolean;
  allegatoObbligatorio: boolean;
  titoloAllegato: string | null;
  ordine: number;
  attivo: boolean;
};

/**
 * Come si paga una cassa che non è del club: i suoi metodi, da aggiungere,
 * cambiare e spegnere.
 *
 * Sta in un componente perché lo usano due pagine: *Altre casse*, dove la
 * segreteria configura tutte le casse, e *Cassa*, dove chi ne gestisce una
 * lavora sulla sua. Chi incassa sa meglio di chiunque dove vuole i soldi —
 * l'IBAN è il suo — e fargli chiedere alla segreteria ogni volta che cambia
 * era un passaggio in più per niente.
 */
export function MetodiCassa({
  cassa,
  metodi,
  richiudibile = false,
}: {
  cassa: { id: string; nome: string };
  metodi: MetodoCassa[];
  /**
   * Chiusa finché non la si tocca, con i nomi dei metodi in vista: per la
   * pagina di chi gestisce la cassa, dove sta in cima ma si tocca di rado.
   */
  richiudibile?: boolean;
}) {
  const dichiarabili = metodi.filter((m) => m.attivo && m.selfService).length;
  const attivi = metodi.filter((m) => m.attivo).length;
  // l'avviso che conta: si vede anche a card chiusa
  const avviso =
    metodi.length === 0
      ? 'Nessun metodo: chi paga una quota di questa cassa non sa come farlo.'
      : attivi === 0
        ? 'Nessun metodo attivo: chi paga una quota di questa cassa non sa come farlo.'
        : null;

  const aggiungi = (
    <BottoneModale
      etichetta="Aggiungi metodo"
      icona="aggiungi"
      titolo={`Nuovo metodo per «${cassa.nome}»`}
      className="btn-ghost btn-sm"
    >
      <FormAzione azione={salvaMetodo}>
        <input type="hidden" name="cassaId" value={cassa.id} />
        <CampiMetodo />
        <Invia icona="salva">Aggiungi</Invia>
      </FormAzione>
    </BottoneModale>
  );

  const elenco = (
    <>
      {metodi.length === 0 ? (
        <p className="text-xs text-warn">
          Nessun metodo: chi paga una quota di questa cassa non sa come farlo.
        </p>
      ) : (
        // l'ordine è quello in cui li vede chi paga: si dà trascinando dalla
        // maniglia, e con un metodo solo non c'è niente da ordinare
        <OrdineMetodi cassaId={cassa.id} ordinabile={metodi.length > 1}>
          {metodi.map((m) => (
            <CardRiga
              key={m.id}
              className={m.attivo ? '' : 'opacity-50'}
              titolo={<span className="text-sm">{m.nome}</span>}
              sottotitolo={m.istruzioni}
              elimina={
                <BottoneElimina
                  azione={eliminaMetodo}
                  valori={{ id: m.id }}
                  conferma={`Eliminare «${m.nome}»? Se è già stato usato verrà solo spento.`}
                  etichetta={`Elimina ${m.nome}`}
                />
              }
              azioni={
                <BottoneModale
                  etichetta="Modifica"
                  icona="modifica"
                  titolo={`Modifica «${m.nome}»`}
                  className="btn-ghost btn-sm"
                >
                  <FormAzione azione={salvaMetodo}>
                    <input type="hidden" name="id" value={m.id} />
                    <CampiMetodo metodo={m} />
                    <Invia icona="salva">Salva</Invia>
                  </FormAzione>
                </BottoneModale>
              }
            >
              {(m.selfService || m.esterni || m.allegatoObbligatorio || !m.attivo) && (
                <span className="flex flex-wrap gap-2">
                  {m.selfService && <Badge tono="ok">dichiarabile</Badge>}
                  {m.allegatoObbligatorio && (
                    <Badge tono="warn">allegato: {m.titoloAllegato ?? 'Ricevuta'}</Badge>
                  )}
                  {m.esterni && <Badge tono="info">squadre esterne</Badge>}
                  {!m.attivo && <Badge tono="neutro">spento</Badge>}
                </span>
              )}
            </CardRiga>
          ))}
        </OrdineMetodi>
      )}
      {metodi.length > 0 && dichiarabili === 0 && (
        <p className="mt-2 text-xs text-warn">
          Nessun metodo dichiarabile: chi paga non può segnalare il pagamento da solo.
        </p>
      )}
    </>
  );

  if (richiudibile) {
    return (
      <CardRichiudibile
        id="come-si-paga"
        conteggio={metodi.length}
        azioni={aggiungi}
        intestazione={
          <>
            {/* accanto al titolo dal tablet in su; sul telefono, accanto a
                «Aggiungi metodo» non c'è spazio e vanno sotto */}
            <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <p className="titolo-sezione shrink-0">Come si paga</p>
            {!avviso && (
              // tutti, interi: quelli che non ci stanno vanno a capo. Niente
              // altezza fissa con il resto nascosto: bastava un carattere un
              // po' più grande sul telefono per tagliarli a metà
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {/* il colore dice come lo si usa: verde lo segnala chi paga,
                    azzurro lo registra solo chi incassa, grigio è spento */}
                {metodi.map((m) => (
                  <span key={m.id} className={m.attivo ? '' : 'opacity-50'}>
                    <Badge tono={!m.attivo ? 'neutro' : m.selfService ? 'ok' : 'info'}>
                      {m.nome}
                    </Badge>
                  </span>
                ))}
              </div>
            )}
            </div>
            {avviso && <p className="mt-1 text-xs text-warn">{avviso}</p>}
          </>
        }
      >
        {/* senza metodi l'avviso sta già nell'intestazione: ripeterlo
            dentro la card aperta lo faceva leggere due volte */}
        {metodi.length > 0 ? elenco : null}
      </CardRichiudibile>
    );
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="titolo-sezione">Come si paga</p>
        {aggiungi}
      </div>
      {elenco}
    </>
  );
}

/** Gli stessi campi dei metodi del club: una cassa si paga come le altre. */
function CampiMetodo({ metodo }: { metodo?: MetodoCassa }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Nome *" span>
        <input
          name="nome"
          required
          defaultValue={metodo?.nome}
          className="input"
          placeholder="es. Bonifico a Mario"
        />
      </Campo>

      <Campo label="Descrizione" span>
        <input
          name="descrizione"
          defaultValue={metodo?.descrizione ?? ''}
          className="input"
          placeholder="Quando si usa"
        />
      </Campo>

      <Campo label="Istruzioni per chi paga" span>
        <textarea
          name="istruzioni"
          rows={2}
          defaultValue={metodo?.istruzioni ?? ''}
          className="input"
          placeholder="IBAN, numero Satispay, «contanti al corso»…"
        />
        {/* chi scrive le istruzioni deve sapere che un indirizzo non resta
            testo: altrimenti lo spezza, o lo mette in un posto dove non serve */}
        <p className="mt-1 text-[11px] text-muted">
          Se dentro c’è un link — paypal.me/…, un link Satispay — chi paga trova il pulsante «Paga
          con …» che lo porta lì.
        </p>
      </Campo>

      <label className="flex min-w-0 items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="selfService"
          defaultChecked={metodo?.selfService ?? true}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span className="min-w-0">
          Chi paga può dichiararlo da sé
          <span className="block text-[11px] text-muted">
            Il pagamento resta comunque da confermare da chi gestisce la cassa: serve solo a
            segnalare che il versamento è partito.
          </span>
        </span>
      </label>

      <label className="flex min-w-0 items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="esterni"
          defaultChecked={metodo?.esterni ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span className="min-w-0">
          Lo usano anche le squadre esterne
          <span className="block text-[11px] text-muted">
            Le squadre collegate che invitate a un’attività a pagamento lo vedono, con descrizione e
            istruzioni, per versare la loro parte in questa cassa.
          </span>
        </span>
      </label>

      <AllegatoObbligatorioCampi
        obbligatorio={metodo?.allegatoObbligatorio ?? false}
        titolo={metodo?.titoloAllegato ?? ''}
      />

      <label className="flex min-w-0 items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="attivo"
          defaultChecked={metodo ? metodo.attivo : true}
          className="h-4 w-4 accent-[color:var(--nvg)]"
        />
        Attivo
      </label>
    </div>
  );
}

/**
 * L'elenco dei metodi, riordinabile dalla maniglia quando ce n'è più d'uno.
 * Le card arrivano già fatte: qui si aggiunge solo la maniglia.
 */
function OrdineMetodi({
  cassaId,
  ordinabile,
  children,
}: {
  cassaId: string | null;
  ordinabile: boolean;
  children: React.ReactElement[];
}) {
  if (!ordinabile) return <div className="space-y-2">{children}</div>;
  return (
    <ElencoOrdinabile
      azione={ordinaMetodi}
      valori={cassaId ? { cassaId } : {}}
      elementi={children.map((c) => ({ id: String(c.key), contenuto: c }))}
    />
  );
}
