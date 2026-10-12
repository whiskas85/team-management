import { requirePermesso } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { prisma } from '@/lib/db';
import { fmtDateTime } from '@/lib/format';
import { ARUBA } from '@/lib/posta';
import { Badge, Campo, Intestazione } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { AzioneBottone } from '@/components/AzioneBottone';
import { provaEmail, salvaServerPosta, togliServerPosta } from '@/actions/posta';

export const dynamic = 'force-dynamic';

/**
 * Il server di posta della squadra: da qui partono le email del gestionale.
 *
 * Si parte dai dati di Aruba, che è dove sta la casella del dominio: basta
 * scrivere la casella e la sua password. Salvando si prova il collegamento,
 * e una prova vera — un'email a sé stessi — dice se arriva.
 */
export default async function PostaPage() {
  await requirePermesso(isAdmin);
  const s = await prisma.serverPosta.findUnique({ where: { id: 'unico' } });

  return (
    <>
      <Intestazione
        titolo="Posta"
        sottotitolo="Il server da cui il gestionale manda le email: la casella della squadra"
      />

      {s && (
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="titolo-sezione">Collegato</p>
            {s.erroreProva ? (
              <Badge tono="danger">Non funziona</Badge>
            ) : (
              <Badge tono="ok">Funziona</Badge>
            )}
          </div>
          <p className="mt-2 text-sm">
            {s.nomeMittente ? `${s.nomeMittente} <${s.mittente}>` : s.mittente} · {s.host}:{s.porta}
          </p>
          {s.provatoIl && (
            <p className="text-xs text-muted">
              Ultima prova: {fmtDateTime(s.provatoIl)}
              {s.erroreProva ? ` — ${s.erroreProva}` : ', andata bene.'}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <AzioneBottone
              azione={provaEmail}
              valori={{}}
              icona="email"
              className="btn-primary btn-sm"
            >
              Mandami un’email di prova
            </AzioneBottone>
            <AzioneBottone
              azione={togliServerPosta}
              valori={{}}
              conferma="Scollegare il server di posta? Le credenziali si cancellano."
              icona="elimina"
              className="btn-ghost btn-sm"
            >
              Scollega
            </AzioneBottone>
          </div>
        </div>
      )}

      <div className="card">
        <p className="titolo-sezione mb-1">{s ? 'Cambia i dati' : 'Collega il server'}</p>
        <p className="mb-4 text-xs text-muted">
          Per una casella Aruba bastano indirizzo e password: server, porta e SSL sono già scritti.
          Per un altro fornitore cerca «SMTP» nelle sue istruzioni.
        </p>
        <FormAzione azione={salvaServerPosta} restaAperto>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Casella (utente) *">
              <input
                name="utente"
                type="email"
                required
                defaultValue={s?.utente ?? ''}
                className="input"
                placeholder="es. info@zerodarkteam.it"
                autoComplete="off"
              />
            </Campo>
            <Campo label={s ? 'Password (vuota: resta quella salvata)' : 'Password *'}>
              <input
                name="password"
                type="password"
                required={!s}
                className="input"
                autoComplete="new-password"
              />
            </Campo>
            <Campo label="Mittente (vuoto: la casella)">
              <input
                name="mittente"
                type="email"
                defaultValue={s && s.mittente !== s.utente ? s.mittente : ''}
                className="input"
              />
            </Campo>
            <Campo label="Nome del mittente">
              <input
                name="nomeMittente"
                defaultValue={s?.nomeMittente ?? ''}
                className="input"
                placeholder="es. Zero Dark Team"
              />
            </Campo>
            <Campo label="Server SMTP *">
              <input name="host" required defaultValue={s?.host ?? ARUBA.host} className="input" />
            </Campo>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <Campo label="Porta">
                <input
                  name="porta"
                  type="number"
                  defaultValue={s?.porta ?? ARUBA.porta}
                  className="input"
                />
              </Campo>
              <label className="mb-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="sicuro"
                  defaultChecked={s?.sicuro ?? ARUBA.sicuro}
                  className="h-4 w-4 accent-nvg"
                />
                SSL
              </label>
            </div>
          </div>
          <p className="text-xs text-muted">
            Porta 465 con SSL (Aruba), oppure 587 senza SSL: allora la connessione passa a TLS dopo
            il saluto. La password si salva cifrata e non si rimostra.
          </p>
          <Invia icona="salva">Salva e prova il collegamento</Invia>
        </FormAzione>
      </div>
    </>
  );
}
