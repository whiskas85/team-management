import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { fmtDateTime } from '@/lib/format';
import { AMBITI } from '@/lib/oidc';
import { Badge, Campo, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { BottoneElimina, CardRiga } from '@/components/CardRiga';
import { creaApp, eliminaApp, nuovoSegretoApp, salvaApp } from '@/actions/oidc';

export const dynamic = 'force-dynamic';

/**
 * Le app collegate: quelle che fanno entrare le persone con l'account del
 * gestionale («Accedi con …»), con OpenID Connect.
 */
export default async function AppCollegatePage() {
  await requirePermesso(isAdmin);
  const [app, base] = await Promise.all([
    prisma.appCollegata.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { consensi: true } } },
    }),
    Promise.resolve(process.env.INDIRIZZO_PUBBLICO?.replace(/\/+$/, '') ?? ''),
  ]);
  const ultimi = await prisma.consensoApp.groupBy({
    by: ['appId'],
    _max: { usatoIl: true },
  });
  const ultimo = new Map(ultimi.map((u) => [u.appId, u._max.usatoIl]));

  return (
    <>
      <Intestazione
        titolo="App collegate"
        sottotitolo="Le app che fanno entrare con l’account del gestionale"
        azioni={
          <BottoneModale etichetta="Nuova app" icona="aggiungi" titolo="Nuova app collegata" larga>
            <FormAzione azione={creaApp} restaAperto>
              <CampiApp />
              <Campo label="Tipo">
                <select name="tipo" className="input" defaultValue="server">
                  <option value="server">Con un suo server (riceve un segreto)</option>
                  <option value="pubblica">
                    Solo nel browser o sul telefono (senza segreto, solo PKCE)
                  </option>
                </select>
              </Campo>
              <Invia icona="salva">Crea</Invia>
            </FormAzione>
          </BottoneModale>
        }
      />

      <div className="card mb-6 text-sm">
        <p className="titolo-sezione mb-2">Per chi collega l’app</p>
        <p className="text-muted">
          Il gestionale è un fornitore OpenID Connect. Nell’app basta l’indirizzo qui sotto: il
          resto (porte, chiavi) lo legge da sola. Flusso: codice di autorizzazione con PKCE S256,
          obbligatorio; ambiti <span className="num">{Object.keys(AMBITI).join(', ')}</span>.
        </p>
        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted">Emittente (issuer)</dt>
          <dd className="num break-all">{base || '— manca INDIRIZZO_PUBBLICO —'}</dd>
          <dt className="text-muted">Configurazione</dt>
          <dd className="num break-all">{base}/.well-known/openid-configuration</dd>
        </dl>
        <p className="mt-3 text-xs text-muted">
          Cosa sa l’app, per ambito: <strong>profile</strong> nome, cognome, callsign;{' '}
          <strong>email</strong> email e se è verificata; <strong>squadra</strong> la squadra, lo
          stato della persona e i suoi ruoli. L’identificativo (<span className="num">sub</span>) è
          sempre lo stesso per la stessa persona.
        </p>
      </div>

      {app.length === 0 ? (
        <Vuoto testo="Nessuna app collegata. «Nuova app» per la prima." />
      ) : (
        <div className="space-y-3">
          {app.map((a) => (
            <CardRiga
              key={a.id}
              card
              titolo={a.nome}
              sottotitolo={
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tono={a.attiva ? 'ok' : 'neutro'}>{a.attiva ? 'attiva' : 'spenta'}</Badge>
                  <Badge tono="neutro">{a.segretoHash ? 'con segreto' : 'senza segreto'}</Badge>
                  <span>
                    {a._count.consensi === 1 ? '1 persona' : `${a._count.consensi} persone`}
                    {ultimo.get(a.id) ? ` · ultimo accesso ${fmtDateTime(ultimo.get(a.id))}` : ''}
                  </span>
                </span>
              }
              elimina={
                <BottoneElimina
                  azione={eliminaApp}
                  valori={{ id: a.id }}
                  conferma={`Eliminare «${a.nome}»? Chi entrava con lei non entrerà più.`}
                  etichetta={`Elimina ${a.nome}`}
                />
              }
              azioni={
                <>
                  <BottoneModale
                    etichetta="Modifica"
                    icona="modifica"
                    titolo={`Modifica «${a.nome}»`}
                    className="btn-ghost btn-sm"
                    larga
                  >
                    <FormAzione azione={salvaApp}>
                      <input type="hidden" name="id" value={a.id} />
                      <CampiApp app={a} />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="attiva"
                          defaultChecked={a.attiva}
                          className="h-4 w-4 accent-[color:var(--nvg)]"
                        />
                        Attiva
                      </label>
                      <Invia icona="salva">Salva</Invia>
                    </FormAzione>
                  </BottoneModale>
                  {a.segretoHash && (
                    <BottoneModale
                      etichetta="Nuovo segreto"
                      icona="chiave"
                      titolo="Nuovo segreto"
                      className="btn-ghost btn-sm"
                    >
                      <FormAzione azione={nuovoSegretoApp} restaAperto>
                        <input type="hidden" name="id" value={a.id} />
                        <p className="text-sm text-muted">
                          Il segreto di adesso smette subito di valere: va cambiato anche nell’app.
                        </p>
                        <Invia icona="chiave">Genera</Invia>
                      </FormAzione>
                    </BottoneModale>
                  )}
                </>
              }
            >
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-[9rem_1fr]">
                <dt className="text-muted">client_id</dt>
                <dd className="num break-all">{a.clientId}</dd>
                <dt className="text-muted">Indirizzi di ritorno</dt>
                <dd className="num break-all">{a.redirectUris.join(' · ')}</dd>
              </dl>
            </CardRiga>
          ))}
        </div>
      )}
    </>
  );
}

function CampiApp({ app }: { app?: { nome: string; redirectUris: string[] } }) {
  return (
    <>
      <Campo label="Nome">
        <input
          name="nome"
          required
          maxLength={80}
          defaultValue={app?.nome}
          placeholder="Torneo, Gioco di squadra…"
          className="input"
        />
        <span className="mt-1 block text-[11px] text-muted">
          È quello che legge la persona quando le si chiede il permesso.
        </span>
      </Campo>
      <Campo label="Indirizzi di ritorno (redirect URI)">
        <textarea
          name="redirectUris"
          required
          rows={3}
          defaultValue={app?.redirectUris.join('\n')}
          placeholder="https://gioco.esempio.it/api/auth/callback/gestionale"
          className="input num text-xs"
        />
        <span className="mt-1 block text-[11px] text-muted">
          Uno per riga, esatti: dopo l’accesso si torna solo lì. https, o http solo per localhost.
        </span>
      </Campo>
    </>
  );
}
