import { fmtDateTime } from '@/lib/format';
import type { Spunte } from '@/lib/bacheche';
import { Markdown, type Menzioni } from './Markdown';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { Campo } from './ui';
import { BottoneModale } from './Modale';
import { AzioneBottone } from './AzioneBottone';
import { BottoneElimina } from './CardRiga';
import { EditoreMarkdown } from './EditoreMarkdown';
import { CampoFile } from './CampoFile';
import { ReazioniBacheca, type ReazioneRaggruppata } from './ReazioniBacheca';
import {
  eliminaMessaggio,
  eliminaRisposta,
  pubblicaMessaggio,
  rispondi,
  salvaMessaggio,
} from '@/actions/bacheche';

export type Citabile = {
  id: string;
  maniglia: string;
  nome: string;
  href?: string;
  /** È una persona: la chiocciola porta alla sua pagina, non apre un file. */
  persona?: boolean;
};

export type ConsegnaLeggibile = {
  nome: string;
  conPush: boolean;
  inviataIl: Date | null;
  ricevutaIl: Date | null;
  lettaIl: Date | null;
};

export type DatiMessaggio = {
  id: string;
  titolo: string | null;
  testo: string;
  banner: string | null;
  autore: string;
  creatoIl: Date;
  pubblicatoIl: Date | null;
  modificatoIl: Date | null;
  mio: boolean;
  puoModerare: boolean;
  spunte: Spunte | null;
  consegne: ConsegnaLeggibile[];
  reazioni: ReazioneRaggruppata[];
  risposte: { id: string; autore: string; testo: string; creataIl: Date; mia: boolean }[];
};

// ------------------------------------------------------------------ spunte

/**
 * Le spunte di WhatsApp, disegnate come quelle.
 *
 * Una grigia: pubblicato. Due grigie: sul telefono di tutti. Due verdi:
 * letto da tutti. Il verde e non il blu perché qui il colore che vuol dire «a
 * posto» è quello della squadra.
 */
function SegnoSpunte({ livello }: { livello: Spunte['livello'] }) {
  const due = livello !== 'pubblicato';
  const colore = livello === 'letto' ? 'text-nvg' : 'text-muted';
  return (
    <svg viewBox="0 0 24 16" width="20" height="14" className={colore} aria-hidden="true">
      <path d="M1.5 8.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {due && (
        <path d="M9.5 12.5l8-9M13 12l.5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

const etichettaLivello: Record<Spunte['livello'], string> = {
  pubblicato: 'pubblicato',
  ricevuto: 'ricevuto da tutti',
  letto: 'letto da tutti',
};

/**
 * Le informazioni del messaggio, come «Info» su WhatsApp: persona per persona.
 *
 * Quattro gruppi, dal più avanti al più indietro. Chi non ha le notifiche sta
 * in un gruppo suo: non è in ritardo, semplicemente il messaggio lo trova
 * quando entra, e l'unica spunta che può dare è quella della lettura.
 */
function InfoConsegne({ consegne }: { consegne: ConsegnaLeggibile[] }) {
  const lette = consegne.filter((c) => c.lettaIl);
  const ricevute = consegne.filter((c) => !c.lettaIl && c.ricevutaIl);
  const inviate = consegne.filter((c) => !c.lettaIl && !c.ricevutaIl && c.inviataIl);
  const senza = consegne.filter((c) => !c.lettaIl && !c.ricevutaIl && !c.inviataIl);

  const gruppo = (titolo: string, righe: ConsegnaLeggibile[], quando: (c: ConsegnaLeggibile) => string) =>
    righe.length > 0 && (
      <div>
        <p className="titolo-sezione mb-1.5">
          {titolo} · <span className="num">{righe.length}</span>
        </p>
        <ul className="space-y-1 text-sm">
          {righe
            .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
            .map((c) => (
              <li key={c.nome} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{c.nome}</span>
                <span className="shrink-0 text-xs text-muted num">{quando(c)}</span>
              </li>
            ))}
        </ul>
      </div>
    );

  return (
    <div className="space-y-5">
      {gruppo('Letto', lette, (c) => fmtDateTime(c.lettaIl!))}
      {gruppo('Ricevuto, non ancora letto', ricevute, (c) => fmtDateTime(c.ricevutaIl!))}
      {gruppo('Notifica partita, non ancora arrivata', inviate, (c) => fmtDateTime(c.inviataIl!))}
      {gruppo('Senza notifica', senza, (c) =>
        c.conPush ? 'notifica non accettata dal telefono' : 'non ha le notifiche accese',
      )}
      <p className="text-xs text-muted">
        «Ricevuto» lo dice il telefono quando mostra la notifica: se la sessione di quella persona
        è scaduta non lo può dire, e resta un passo indietro. «Letto» vuol dire che ha aperto la
        bacheca con il messaggio davanti.
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ modulo

/** Scrivere o correggere un messaggio: titolo, immagine, testo. */
export function FormMessaggio({
  bachecaId,
  messaggio,
  citabili,
}: {
  bachecaId: string;
  messaggio?: { id: string; titolo: string | null; testo: string; banner: boolean };
  citabili: Citabile[];
}) {
  return (
    <FormAzione azione={salvaMessaggio}>
      {messaggio ? (
        <input type="hidden" name="id" value={messaggio.id} />
      ) : (
        <input type="hidden" name="bachecaId" value={bachecaId} />
      )}
      <Campo label="Titolo">
        <input
          name="titolo"
          defaultValue={messaggio?.titolo ?? ''}
          className="input"
          placeholder="Facoltativo: se c'è, è quello che si legge nella notifica"
        />
      </Campo>
      <CampoFile
        label={messaggio?.banner ? 'Cambia la foto banner' : 'Foto banner'}
        name="banner"
        accept="image/jpeg,image/png,image/webp"
        estensioni={['.jpg', '.jpeg', '.png', '.webp']}
        maxBytes={10 * 1024 * 1024}
        aiuto="Facoltativa: sta in cima all’annuncio come la foto di un messaggio WhatsApp, larga quanto l’annuncio e alta quanto la foto. JPG, PNG o WEBP."
      />
      {messaggio?.banner && (
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="togliBanner" /> Togli la foto banner
        </label>
      )}
      <div>
        <p className="label">Messaggio *</p>
        <EditoreMarkdown
          nome="testo"
          valore={messaggio?.testo ?? ''}
          righe={10}
          persone={citabili}
          segnaposto="Scrivi qui. Con @ richiami una persona o un documento della bacheca."
        />
      </div>
      <Invia icona="salva">{messaggio ? 'Salva' : 'Salva la bozza'}</Invia>
      {!messaggio && (
        <p className="text-xs text-muted">
          Nasce come bozza: la vedono solo quelli che scrivono qui. La notifica parte quando la
          rilasci.
        </p>
      )}
    </FormAzione>
  );
}

// --------------------------------------------------------------- messaggio

export function MessaggioBacheca({
  bachecaId,
  m,
  menzioni,
  citabili,
  emoji,
}: {
  bachecaId: string;
  m: DatiMessaggio;
  menzioni: Menzioni;
  citabili: Citabile[];
  emoji: readonly string[];
}) {
  const bozza = !m.pubblicatoIl;

  return (
    <article id={`m-${m.id}`} className={`card scroll-mt-20 overflow-hidden p-0 ${bozza ? 'border-dashed border-warn/60' : ''}`}>
      {/* il banner come su WhatsApp: largo quanto il messaggio, alto quanto
          la foto. Prima si tagliava a un'altezza fissa, e di una locandina
          restava una striscia */}
      {m.banner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.banner} alt="" className="block h-auto w-full" />
      )}

      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {bozza && (
              <span className="mb-1 inline-block rounded bg-warn/15 px-1.5 py-0.5 text-[11px] uppercase tracking-[0.06em] text-warn">
                Bozza · la vedi solo tu e chi scrive qui
              </span>
            )}
            {m.titolo && <h2 className="break-words text-lg font-semibold">{m.titolo}</h2>}
            <p className="text-xs text-muted num">
              {m.autore} ·{' '}
              {m.pubblicatoIl ? `pubblicato il ${fmtDateTime(m.pubblicatoIl)}` : `scritto il ${fmtDateTime(m.creatoIl)}`}
              {m.modificatoIl && ` · modificato il ${fmtDateTime(m.modificatoIl)}`}
            </p>
          </div>
          {(m.mio || m.puoModerare) && (
            <BottoneElimina
              azione={eliminaMessaggio}
              valori={{ id: m.id }}
              conferma={`Togliere ${m.titolo ? `«${m.titolo}»` : 'questo messaggio'} dalla bacheca, con reazioni e risposte?`}
              etichetta="Togli il messaggio"
            />
          )}
        </div>

        <Markdown testo={m.testo} menzioni={menzioni} />

        {/* le azioni di chi l'ha scritto */}
        {(m.mio || (bozza && m.puoModerare)) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {bozza && (
              <AzioneBottone
                azione={pubblicaMessaggio}
                valori={{ id: m.id }}
                icona="rilascia"
                className="btn-primary btn-sm"
                conferma="Rilasciare il messaggio? Da questo momento lo vedono tutti e parte la notifica."
              >
                Rilascia
              </AzioneBottone>
            )}
            {m.mio && (
              <BottoneModale etichetta="Modifica" icona="modifica" titolo="Modifica il messaggio" className="btn-ghost btn-sm" larga>
                <FormMessaggio
                  bachecaId={bachecaId}
                  citabili={citabili}
                  messaggio={{ id: m.id, titolo: m.titolo, testo: m.testo, banner: !!m.banner }}
                />
              </BottoneModale>
            )}
          </div>
        )}

        {!bozza && (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <ReazioniBacheca messaggioId={m.id} reazioni={m.reazioni} emoji={emoji} />

              {m.spunte && (
                <BottoneModale
                  etichetta={`${m.spunte.lette}/${m.spunte.destinatari} letto`}
                  titolo="Chi l'ha ricevuto e chi l'ha letto"
                  className="btn-ghost btn-sm"
                >
                  <div className="mb-4 flex items-center gap-2 text-sm">
                    <SegnoSpunte livello={m.spunte.livello} />
                    <span>{etichettaLivello[m.spunte.livello]}</span>
                    <span className="ml-auto text-xs text-muted num">
                      notifica partita a {m.spunte.inviate} · arrivata a {m.spunte.ricevute} · letto da{' '}
                      {m.spunte.lette} su {m.spunte.destinatari}
                    </span>
                  </div>
                  {m.consegne.length === 0 ? (
                    <p className="text-sm text-muted">Non c’era nessun altro a cui mandarlo.</p>
                  ) : (
                    <InfoConsegne consegne={m.consegne} />
                  )}
                </BottoneModale>
              )}
            </div>
            {m.spunte && (
              <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted" title={etichettaLivello[m.spunte.livello]}>
                <SegnoSpunte livello={m.spunte.livello} /> {etichettaLivello[m.spunte.livello]}
              </p>
            )}

            {/* le risposte: le battute stanno qui sotto, non sopra al messaggio */}
            {m.risposte.length > 0 && (
              <ul className="mt-3 space-y-2 border-l-2 border-line pl-3">
                {m.risposte.map((r) => (
                  <li key={r.id} className="text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-muted num">
                        <strong className="text-ink">{r.autore}</strong> · {fmtDateTime(r.creataIl)}
                      </p>
                      {(r.mia || m.puoModerare) && (
                        <BottoneElimina
                          azione={eliminaRisposta}
                          valori={{ id: r.id }}
                          conferma="Togliere questa risposta?"
                          etichetta="Togli la risposta"
                          piccolo
                        />
                      )}
                    </div>
                    <div className="-my-2">
                      <Markdown testo={r.testo} menzioni={menzioni} />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3">
              <BottoneModale etichetta="Rispondi" icona="commento" titolo="Rispondi" className="btn-ghost btn-sm">
                <FormAzione azione={rispondi}>
                  <input type="hidden" name="messaggioId" value={m.id} />
                  <EditoreMarkdown
                    nome="testo"
                    righe={4}
                    persone={citabili}
                    aiuto={false}
                    segnaposto="Con @ richiami qualcuno: gli arriva una notifica."
                  />
                  <Invia icona="commento">Rispondi</Invia>
                </FormAzione>
              </BottoneModale>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
