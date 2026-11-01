'use client';

import { useActionState, useState, useTransition } from 'react';
import {
  attivaMfa,
  disattivaMfa,
  nuoviCodiciMfa,
  preparaMfa,
  type EsitoMfaForm,
} from '@/actions/mfa';
import { Icona } from './Icona';
import { fmtDate } from '@/lib/format';

/**
 * «Verifica in due passaggi», nel profilo. Facoltativa.
 *
 * Spenta: un pulsante. Premendolo compare il QR da inquadrare con Google
 * Authenticator (o qualunque app di codici), il segreto da scrivere a mano se
 * la fotocamera non collabora, e la casella per il primo codice: solo quando
 * quel codice è giusto si accende davvero. Allora compaiono i codici di
 * recupero, una volta sola.
 *
 * Accesa: quanti codici di recupero restano, e due gesti — codici nuovi,
 * spegnerla — che chiedono entrambi un codice, così non li fa chi trova il
 * telefono sbloccato con il gestionale aperto.
 */
export function VerificaDueStep({
  attivaIl,
  recuperoRimasti,
  entratoConRecupero,
}: {
  attivaIl: Date | string | null;
  recuperoRimasti: number;
  entratoConRecupero: boolean;
}) {
  const [preparazione, setPreparazione] = useState<EsitoMfaForm | null>(null);
  const [inAttesa, avvia] = useTransition();
  const [attivazione, attiva] = useActionState(attivaMfa, {} as EsitoMfaForm);
  const [rinnovo, rinnova] = useActionState(nuoviCodiciMfa, {} as EsitoMfaForm);
  const [spegnimento, spegni] = useActionState(disattivaMfa, {} as EsitoMfaForm);
  const [gesto, setGesto] = useState<'codici' | 'spegni' | null>(null);

  const codici = attivazione.codici ?? rinnovo.codici;
  if (codici) return <CodiciRecupero codici={codici} ok={attivazione.ok ?? rinnovo.ok} />;

  if (!attivaIl || spegnimento.ok) {
    return (
      <div className="space-y-3 text-sm">
        {spegnimento.ok && <Esito ok={spegnimento.ok} />}
        <p className="text-muted">
          Oltre alla password, all’accesso ti chiede un codice di sei cifre che cambia ogni 30
          secondi, dall’app del telefono: <strong>Google Authenticator</strong>, Microsoft
          Authenticator, 1Password o simili. Chi scopre la tua password, senza il telefono, non
          entra. È facoltativa.
        </p>

        {!preparazione?.qr ? (
          <>
            {preparazione?.errore && <Esito errore={preparazione.errore} />}
            <button
              type="button"
              disabled={inAttesa}
              onClick={() => avvia(async () => setPreparazione(await preparaMfa()))}
              className="btn-primary btn-sm"
            >
              <Icona nome="scudo" size={15} /> {inAttesa ? 'Preparo…' : 'Attiva'}
            </button>
          </>
        ) : (
          <form action={attiva} className="space-y-3">
            {/* Dallo stesso telefono il QR non si inquadra: c'è il link che
                apre l'app direttamente, e la chiave da copiare e incollare. */}
            <div className="space-y-2 rounded-md border border-line bg-surface2 p-3">
              <p className="font-medium">Sei sul telefono dove hai l’app?</p>
              <div className="flex flex-wrap gap-2">
                <a href={preparazione.link} className="btn-primary btn-sm">
                  <Icona nome="apri" size={15} /> Aggiungi all’app di autenticazione
                </a>
              </div>
              <p className="text-sm">
                La chiave: <ChiaveDaToccare chiave={preparazione.segreto ?? ''} />
              </p>
              <p className="text-xs text-muted">
                Il primo pulsante apre Google Authenticator con l’account già pronto. Se non succede
                niente, copia la chiave e in Google Authenticator tocca <strong>+</strong> →{' '}
                <strong>Inserisci una chiave di configurazione</strong>: un nome a piacere, incolla
                la chiave, tipo <strong>Basata sull’ora</strong> → Aggiungi. Poi torna qui.
              </p>
            </div>

            <div className="space-y-2 rounded-md border border-line p-3">
              <p className="font-medium">Oppure da un altro schermo</p>
              <p className="text-xs text-muted">
                Con il gestionale aperto sul computer: in Google Authenticator <strong>+</strong> →{' '}
                <strong>Scansiona un codice QR</strong> e inquadra questo.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preparazione.qr}
                alt="Codice QR da inquadrare con l’app di autenticazione"
                width={180}
                height={180}
                className="rounded-md bg-white p-2"
              />
              <p className="text-xs text-muted">
                Chiave per inserirla a mano: <ChiaveDaToccare chiave={preparazione.segreto ?? ''} />
              </p>
            </div>

            <p className="font-medium">
              Poi scrivi qui il codice di sei cifre che l’app ti mostra:
            </p>
            {attivazione.errore && <Esito errore={attivazione.errore} />}
            <div className="flex flex-wrap gap-2">
              <input
                name="codice"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                placeholder="123456"
                aria-label="Codice dall’app"
                className="input num w-36 text-center tracking-[0.2em]"
              />
              <button type="submit" className="btn-primary btn-sm">
                Conferma e attiva
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="flex items-center gap-2 text-nvg">
        <Icona nome="scudo" size={16} />
        <span>
          <strong>Attiva</strong> dal {fmtDate(attivaIl)}: all’accesso, dopo la password, ti chiede
          il codice dell’app.
        </span>
      </p>
      {entratoConRecupero && (
        <Esito errore="Sei entrato con un codice di recupero: valeva una volta sola. Se hai cambiato telefono, spegnila e riattivala con quello nuovo." />
      )}
      <p className={recuperoRimasti <= 2 ? 'text-warn' : 'text-muted'}>
        Codici di recupero ancora buoni: <span className="num">{recuperoRimasti}</span> su 10.
        {recuperoRimasti <= 2 && ' Fanne di nuovi.'}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setGesto(gesto === 'codici' ? null : 'codici')}
          className="btn-ghost btn-sm"
        >
          Nuovi codici di recupero
        </button>
        <button
          type="button"
          onClick={() => setGesto(gesto === 'spegni' ? null : 'spegni')}
          className="btn-ghost btn-sm text-danger"
        >
          Disattiva
        </button>
      </div>

      {gesto && (
        <form action={gesto === 'codici' ? rinnova : spegni} className="space-y-2">
          <p className="text-xs text-muted">
            {gesto === 'codici'
              ? 'Scrivi il codice dell’app: i codici di recupero di prima smettono di valere.'
              : 'Scrivi il codice dell’app (o uno di recupero) per spegnerla.'}
          </p>
          {(gesto === 'codici' ? rinnovo : spegnimento).errore && (
            <Esito errore={(gesto === 'codici' ? rinnovo : spegnimento).errore} />
          )}
          <div className="flex flex-wrap gap-2">
            <input
              key={gesto}
              name="codice"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={11}
              placeholder="123456"
              aria-label="Codice dall’app"
              className="input num w-36 text-center tracking-[0.2em]"
            />
            <button
              type="submit"
              className={gesto === 'spegni' ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
            >
              {gesto === 'codici' ? 'Crea i codici' : 'Disattiva'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** La chiave scritta in verde: toccandola si copia. */
function ChiaveDaToccare({ chiave }: { chiave: string }) {
  const [copiata, setCopiata] = useState(false);
  return (
    <button
      type="button"
      title="Tocca per copiare"
      onClick={() =>
        navigator.clipboard
          ?.writeText(chiave.replace(/\s/g, ''))
          .then(() => setCopiata(true))
          .catch(() => {})
      }
      className="num inline break-all text-left font-semibold text-nvg underline decoration-dotted underline-offset-4 hover:text-nvg/80"
    >
      {chiave}
      <span className="ml-1.5 whitespace-nowrap text-xs font-normal no-underline">
        {copiata ? '✓ copiata' : '· tocca per copiare'}
      </span>
    </button>
  );
}

/** I codici di recupero: una volta sola, da copiare o stampare. */
function CodiciRecupero({ codici, ok }: { codici: string[]; ok?: string }) {
  const [copiati, setCopiati] = useState(false);
  return (
    <div className="space-y-3 text-sm">
      {ok && <Esito ok={ok} />}
      <p>
        <strong>Codici di recupero.</strong> Se perdi il telefono, ognuno di questi ti fa entrare al
        posto del codice dell’app, una volta sola. <strong>Salvali adesso</strong> (gestore di
        password, foto, foglio in un cassetto): non li vedrai più.
      </p>
      <ul className="num grid grid-cols-2 gap-1.5 rounded-md border border-line bg-surface2 p-3 text-center">
        {codici.map((c) => (
          <li key={c} className="select-all">
            {c}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() =>
          navigator.clipboard
            ?.writeText(codici.join('\n'))
            .then(() => setCopiati(true))
            .catch(() => {})
        }
      >
        <Icona nome="allegato" size={15} /> {copiati ? 'Copiati' : 'Copia i codici'}
      </button>
    </div>
  );
}

function Esito({ ok, errore }: { ok?: string; errore?: string }) {
  if (errore) {
    return (
      <p
        role="alert"
        className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-danger"
      >
        {errore}
      </p>
    );
  }
  return <p className="rounded-md border border-nvg/40 bg-nvg/10 px-3 py-2 text-nvg">{ok}</p>;
}
