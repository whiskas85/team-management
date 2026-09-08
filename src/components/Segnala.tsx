import { Campo } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { segnalaCommento } from '@/actions/segnalazioni';

/**
 * «Questo messaggio non va bene.»
 *
 * Sta accanto a *elimina* ma fa il contrario: elimina è di chi il messaggio lo
 * possiede, segnala è di chi lo subisce. Chiedere il motivo è facoltativo —
 * obbligarlo vorrebbe dire che chi si è preso un insulto deve anche scrivere
 * un tema per poterlo dire.
 */
export function Segnala({ tipo, id }: { tipo: 'annuncio' | 'evento'; id: string }) {
  return (
    <BottoneModale
      etichetta="segnala"
      titolo="Segnala il messaggio"
      className="text-[11px] text-muted transition-colors hover:text-warn"
    >
      <FormAzione azione={segnalaCommento}>
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="id" value={id} />

        <p className="text-sm text-muted">
          Lo guarda un moderatore, che decide se toglierlo. Chi l’ha scritto non sa chi l’ha
          segnalato.
        </p>

        <Campo label="Cosa non va (facoltativo)" span>
          <textarea
            name="motivo"
            rows={3}
            maxLength={500}
            className="input"
            placeholder="Offensivo, fuori luogo, prende di mira qualcuno…"
          />
        </Campo>

        <Invia icona="rifiuta">Segnala</Invia>
      </FormAzione>
    </BottoneModale>
  );
}
