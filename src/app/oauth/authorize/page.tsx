import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { marchio } from '@/lib/mia-squadra';
import { AMBITI, creaCodice } from '@/lib/oidc';
import { controllaRichiesta, ritorno } from '@/lib/oidc-richiesta';
import { Logo } from '@/components/Logo';
import { consentiApp, rifiutaApp } from '@/actions/oidc';

export const dynamic = 'force-dynamic';

/**
 * La porta d'ingresso per le app collegate («Accedi con …»).
 *
 * Chi non è dentro passa dall'accesso e torna qui. La prima volta con
 * un'app si chiede il permesso, dicendo **cosa** l'app saprà; dopo, se l'app
 * non chiede niente di nuovo, si torna subito indietro. Dal profilo il
 * permesso si toglie.
 */
export default async function AutorizzaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const r = await controllaRichiesta(p);
  const m = await marchio();

  if ('fermo' in r) {
    return (
      <Cornice titolo="Accesso non possibile" nome={m.nomeGestionale}>
        <p className="text-sm text-danger">{r.fermo}</p>
        <p className="mt-2 text-xs text-muted">
          Se l’app è della tua squadra, chi la gestisce deve registrarla in Sistema → App collegate.
        </p>
      </Cornice>
    );
  }
  if ('torna' in r) redirect(r.torna as string);
  const { app, ambiti, richiesta } = r;

  const me = await getCurrentUser();
  if (!me) {
    if (richiesta.prompt === 'none') {
      redirect(ritorno(richiesta.redirectUri, { error: 'login_required', state: richiesta.state }));
    }
    const qui = `/oauth/authorize?${new URLSearchParams(
      Object.entries(p).filter((e): e is [string, string] => typeof e[1] === 'string'),
    )}`;
    redirect(`/login?dopo=${encodeURIComponent(qui)}`);
  }
  if (me.stato === 'DISABILITATO') {
    redirect(ritorno(richiesta.redirectUri, { error: 'access_denied', state: richiesta.state }));
  }

  // già detto di sì a tutto quello che chiede: si torna subito
  const consenso = await prisma.consensoApp.findUnique({
    where: { userId_appId: { userId: me.id, appId: app.id } },
  });
  const concessi = new Set(consenso?.scope.split(' ') ?? []);
  if (consenso && ambiti.every((a) => concessi.has(a))) {
    const codice = await creaCodice({
      appId: app.id,
      userId: me.id,
      redirectUri: richiesta.redirectUri,
      scope: richiesta.scope,
      nonce: richiesta.nonce,
      codeChallenge: richiesta.codeChallenge,
    });
    redirect(ritorno(richiesta.redirectUri, { code: codice, state: richiesta.state }));
  }
  if (richiesta.prompt === 'none') {
    redirect(ritorno(richiesta.redirectUri, { error: 'consent_required', state: richiesta.state }));
  }

  const nascosti = (
    <>
      {(
        [
          'client_id',
          'redirect_uri',
          'scope',
          'state',
          'nonce',
          'code_challenge',
          'code_challenge_method',
          'response_type',
        ] as const
      ).map((k) => (p[k] ? <input key={k} type="hidden" name={k} value={p[k]} /> : null))}
    </>
  );
  const dominio = new URL(richiesta.redirectUri).host;

  return (
    <Cornice titolo={`Accedi a «${app.nome}»`} nome={m.nomeGestionale}>
      <p className="text-sm">
        <strong>{app.nome}</strong> vuole farti entrare con il tuo account di{' '}
        <strong>{m.nomeGestionale}</strong>, come{' '}
        <strong>{me.callsign || `${me.nome} ${me.cognome}`}</strong>.
      </p>
      <p className="mt-3 text-xs text-muted">Potrà sapere:</p>
      <ul className="mt-1 space-y-1 text-sm">
        {ambiti.map((a) => (
          <li key={a} className="flex gap-2">
            <span className="text-nvg">✓</span>
            {AMBITI[a]}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Non vedrà mai la tua password. Dopo l’accesso tornerai su{' '}
        <span className="num">{dominio}</span>. Il permesso si toglie quando vuoi dal tuo profilo,
        in «App collegate».
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <form action={consentiApp}>
          {nascosti}
          <button type="submit" className="btn-primary">
            Va bene, entra
          </button>
        </form>
        <form action={rifiutaApp}>
          {nascosti}
          <button type="submit" className="btn-ghost">
            No, grazie
          </button>
        </form>
      </div>
    </Cornice>
  );
}

function Cornice({
  titolo,
  nome,
  children,
}: {
  titolo: string;
  nome: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={64} />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted">{nome}</p>
          <h1 className="mt-1 text-xl font-semibold">{titolo}</h1>
        </div>
        <div className="card">{children}</div>
      </div>
    </main>
  );
}
