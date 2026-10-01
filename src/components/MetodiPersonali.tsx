import { eliminaMetodoPersonale, salvaMetodoPersonale } from '@/actions/metodi-personali';
import { primoIban, primoLink } from '@/lib/link';
import { BottoneModale } from './Modale';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { BottoneElimina } from './CardRiga';
import { Badge, Campo } from './ui';

type Metodo = { id: string; nome: string; istruzioni: string | null };

function CampiMetodo({ metodo }: { metodo?: Metodo }) {
  return (
    <div className="space-y-4">
      <Campo label="Nome *" span>
        <input
          name="nome"
          required
          maxLength={40}
          defaultValue={metodo?.nome}
          className="input"
          placeholder="Bonifico, PayPal, Satispay…"
        />
      </Campo>
      <Campo label="Come pagarti *" span>
        <textarea
          name="istruzioni"
          required
          rows={3}
          maxLength={500}
          defaultValue={metodo?.istruzioni ?? ''}
          className="input"
          placeholder="IT60 X054 2811 1010 0000 0123 456 intestato a Mario Rossi — oppure paypal.me/mariorossi"
        />
        <span className="mt-1 block text-[11px] text-muted">
          Un link (paypal.me/…, Satispay) diventa il pulsante «Paga», un IBAN il pulsante «Copia
          IBAN».
        </span>
      </Campo>
    </div>
  );
}

/**
 * I modi per pagare una persona, dal suo profilo: chi le deve dei soldi dalla
 * cassa — un rimborso, una spesa anticipata — li trova già pronti, con i link.
 */
export function MetodiPersonali({ metodi, userId }: { metodi: Metodo[]; userId?: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Come vuoi essere pagato quando la squadra ti deve dei soldi: un rimborso, una spesa che hai
        anticipato. Chi registra l’uscita in cassa li vede, con i link per pagarti.
      </p>
      <p className="text-xs text-muted">
        Dal telefono Android, con l’app installata: nell’app di PayPal, Satispay o della banca
        premi «Condividi» sul tuo link o IBAN e scegli questa app — arrivi qui con il modulo già
        compilato.
      </p>
      {metodi.length === 0 ? (
        <p className="text-sm text-muted">Non hai ancora indicato nessun metodo.</p>
      ) : (
        <div className="space-y-2">
          {metodi.map((m) => (
            <div key={m.id} className="rounded-lg border border-line bg-surface2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.nome}</p>
                  <p className="whitespace-pre-line break-words text-xs text-muted">
                    {m.istruzioni}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {primoLink(m.istruzioni) && <Badge tono="ok">link: diventa «Paga»</Badge>}
                    {primoIban(m.istruzioni) && <Badge tono="info">IBAN: si copia</Badge>}
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1.5">
                  <BottoneModale
                    etichetta="Modifica"
                    icona="modifica"
                    titolo={`Modifica ${m.nome}`}
                    className="btn-ghost btn-sm"
                  >
                    <FormAzione azione={salvaMetodoPersonale} className="space-y-4">
                      <input type="hidden" name="id" value={m.id} />
                      <CampiMetodo metodo={m} />
                      <Invia icona="salva">Salva</Invia>
                    </FormAzione>
                  </BottoneModale>
                  <BottoneElimina
                    azione={eliminaMetodoPersonale}
                    valori={{ id: m.id }}
                    conferma={`Togliere «${m.nome}»?`}
                    etichetta={`Togli ${m.nome}`}
                    piccolo
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <BottoneModale
        etichetta="Aggiungi metodo"
        icona="aggiungi"
        titolo="Nuovo metodo per essere pagato"
        className="btn-ghost btn-sm"
      >
        <FormAzione azione={salvaMetodoPersonale} className="space-y-4">
          {userId && <input type="hidden" name="userId" value={userId} />}
          <CampiMetodo />
          <Invia icona="salva">Aggiungi</Invia>
        </FormAzione>
      </BottoneModale>
    </div>
  );
}
