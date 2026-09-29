import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { datiMancanti } from '@/lib/profilo-mancante';
import { Logo } from '@/components/Logo';
import { FormAzione } from '@/components/Form';
import { Campo } from '@/components/ui';
import { Invia } from '@/components/Bottone';
import { completaProfilo } from '@/actions/operatori';

/**
 * I dati che mancano, chiesti una volta sola al primo accesso.
 *
 * Chi arriva da un contatto è stato creato con quello che si sapeva: qui
 * mette il resto, e solo il resto — i campi che ci sono già non si vedono.
 * Sta fuori dal gruppo (app) per lo stesso motivo del cambio password: il
 * controllo che porta qui vive nel layout di quel gruppo.
 */
export default async function CompletaProfiloPage() {
  const me = await requireUser();
  if (me.deveCambiarePassword) redirect('/cambia-password');
  const mancano = await datiMancanti(me.id);
  if (!mancano) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={64} />
          <h1 className="mt-4 text-xl font-semibold">Benvenuto, {me.nome}!</h1>
          <p className="mt-2 text-sm text-muted">
            Ci mancano un paio di dati: servono per il tesseramento e per l’assicurazione della tua
            prima giornata in campo. Li chiediamo una volta sola.
          </p>
        </div>

        <div className="card">
          <FormAzione azione={completaProfilo}>
            <div className="space-y-4">
              {mancano.cognome && (
                <Campo label="Cognome *">
                  <input name="cognome" required className="input" autoComplete="family-name" />
                </Campo>
              )}
              {mancano.telefono && (
                <Campo label="Telefono *">
                  <input
                    name="telefono"
                    type="tel"
                    required
                    className="input"
                    autoComplete="tel"
                  />
                </Campo>
              )}
              {mancano.dataNascita && (
                <Campo label="Data di nascita *">
                  <input name="dataNascita" type="date" required className="input" />
                </Campo>
              )}
              {mancano.luogoNascita && (
                <Campo label="Luogo di nascita *">
                  <input
                    name="luogoNascita"
                    required
                    className="input"
                    placeholder="Comune (e provincia se all’estero, lo Stato)"
                  />
                </Campo>
              )}
            </div>
            <Invia icona="salva" className="btn-primary w-full">
              Salva ed entra
            </Invia>
          </FormAzione>
        </div>
      </div>
    </main>
  );
}
