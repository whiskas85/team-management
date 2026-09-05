import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { FormAzione } from '@/components/Form';
import { Campo } from '@/components/ui';
import { Invia } from '@/components/Bottone';
import { cambiaPassword } from '@/actions/operatori';

/**
 * Cambio password obbligatorio.
 *
 * Sta fuori dal gruppo (app) di proposito: il controllo che porta qui vive nel
 * layout di quel gruppo, e una pagina dentro allo stesso gruppo si
 * rimanderebbe a sé stessa all'infinito.
 */
export default async function CambiaPasswordPage() {
  const me = await requireUser();

  // chi ci arriva per curiosità torna da dove è venuto
  if (!me.deveCambiarePassword) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={64} />
          <h1 className="mt-4 text-xl font-semibold">Scegli la tua password</h1>
          <p className="mt-2 text-sm text-muted">
            Quella con cui sei entrato l&rsquo;ha generata l&rsquo;amministrazione e te l&rsquo;ha
            passata a voce. Sostituiscila con una tua: da qui non si va avanti finch&eacute; non
            l&rsquo;hai fatto.
          </p>
        </div>

        <div className="card">
          <FormAzione azione={cambiaPassword}>
            <input type="hidden" name="ritorno" value="/dashboard" />
            <div className="space-y-4">
              <Campo label="Password attuale *">
                <input
                  name="attuale"
                  type="password"
                  required
                  className="input"
                  autoComplete="current-password"
                  placeholder="quella che ti hanno dato"
                />
              </Campo>
              <Campo label="Nuova password *">
                <input
                  name="nuova"
                  type="password"
                  required
                  minLength={8}
                  className="input"
                  autoComplete="new-password"
                />
              </Campo>
              <Campo label="Conferma la nuova *">
                <input
                  name="conferma"
                  type="password"
                  required
                  minLength={8}
                  className="input"
                  autoComplete="new-password"
                />
              </Campo>
            </div>
            <Invia icona="salva" className="btn-primary w-full">
              Cambia password
            </Invia>
          </FormAzione>
        </div>
      </div>
    </main>
  );
}
