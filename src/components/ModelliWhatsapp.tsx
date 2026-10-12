import type { ScatenanteMessaggio } from '@prisma/client';
import { fmtDateTime } from '@/lib/format';
import { SCATENANTI } from '@/lib/messaggi';
import { Badge, Campo, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { BottoneElimina, CardRiga } from '@/components/CardRiga';
import {
  accendiTesto,
  aggiungiTesti,
  eliminaBozza,
  eliminaModello,
  eliminaTesto,
  inviaMessaggiPronti,
  salvaModello,
  salvaTesto,
} from '@/actions/messaggi';

/**
 * I modelli dei messaggi WhatsApp e la coda di quelli pronti.
 *
 * Stanno in due pagine: in Messaggi i compleanni, i promemoria e le quote; in
 * Certificati medici, scheda WhatsApp, quelli del certificato in scadenza —
 * lì dove si guardano le scadenze. Il pezzo è lo stesso, cambia quali
 * occasioni mostra.
 */

type Modello = {
  id: string;
  titolo: string;
  scatenante: ScatenanteMessaggio;
  destinazione: string;
  gruppoId: string | null;
  attivo: boolean;
  testi: { id: string; testo: string; attivo: boolean; volte: number; usatoIl: Date | null }[];
};

export function ModelliWhatsapp({
  modelli,
  gruppi,
  ordine,
}: {
  modelli: Modello[];
  gruppi: { id: string; nome: string }[];
  /** Le occasioni da mostrare, in quest'ordine. */
  ordine: ScatenanteMessaggio[];
}) {
  const ORDINE = ordine;
  return (
    <>
      {/* ---------------------------------------------------- modelli */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="titolo-sezione">Modelli</h2>
        <BottoneModale etichetta="Nuovo modello" icona="aggiungi" titolo="Nuovo modello" larga>
          <FormAzione azione={salvaModello}>
            <CampiModello gruppi={gruppi} ordine={ORDINE} />
            <Invia icona="salva">Crea</Invia>
          </FormAzione>
        </BottoneModale>
      </div>

      <div className="space-y-6">
        {ORDINE.map((s) => {
          const suoi = modelli.filter((m) => m.scatenante === s);
          return (
            <div key={s}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-nvg">
                {SCATENANTI[s].titolo} · {suoi.length}
              </p>
              <p className="mb-2 text-xs text-muted">
                {SCATENANTI[s].quando} · segnaposto:{' '}
                {SCATENANTI[s].segnaposto.map((v) => `{${v}}`).join(' ')}
              </p>

              {suoi.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-3 text-xs text-muted">
                  Nessun modello: senza, questo messaggio non parte.
                </p>
              ) : (
                <div className="space-y-3">
                  {suoi.map((m) => {
                    const accesi = m.testi.filter((t) => t.attivo).length;
                    return (
                      <CardRiga
                        key={m.id}
                        titolo={m.titolo}
                        sottotitolo={
                          <span className="flex flex-wrap items-center gap-2">
                            <Badge tono={m.destinazione === 'GRUPPO' ? 'info' : 'neutro'}>
                              {m.destinazione === 'GRUPPO' ? 'nel gruppo' : 'in privato'}
                            </Badge>
                            {!m.attivo && <Badge tono="neutro">spento</Badge>}
                            <span className="num">
                              {accesi === 1
                                ? '1 testo in rotazione'
                                : `${accesi} testi in rotazione`}
                              {m.testi.length > accesi
                                ? ` · ${m.testi.length - accesi} spenti`
                                : ''}
                            </span>
                          </span>
                        }
                        elimina={
                          <BottoneElimina
                            azione={eliminaModello}
                            valori={{ id: m.id }}
                            conferma={`Eliminare «${m.titolo}» e i suoi ${m.testi.length} testi?`}
                            etichetta={`Elimina ${m.titolo}`}
                          />
                        }
                        azioni={
                          <>
                            <BottoneModale
                              etichetta="Aggiungi testi"
                              icona="aggiungi"
                              titolo={`Testi per «${m.titolo}»`}
                              className="btn-ghost btn-sm"
                              larga
                            >
                              <FormAzione azione={aggiungiTesti}>
                                <input type="hidden" name="modelloId" value={m.id} />
                                <CampiTesti scatenante={m.scatenante} />
                                <Invia icona="salva">Aggiungi</Invia>
                              </FormAzione>
                            </BottoneModale>
                            <BottoneModale
                              etichetta="Modifica"
                              icona="modifica"
                              titolo="Modifica modello"
                              className="btn-ghost btn-sm"
                              larga
                            >
                              <FormAzione azione={salvaModello}>
                                <input type="hidden" name="id" value={m.id} />
                                <CampiModello modello={m} gruppi={gruppi} ordine={ORDINE} />
                                <Invia icona="salva">Salva</Invia>
                              </FormAzione>
                            </BottoneModale>
                          </>
                        }
                      >
                        {m.testi.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted">
                            Nessun testo: il modello c’è ma non ha niente da dire.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {m.testi.map((t) => (
                              <CardRiga
                                key={t.id}
                                className={t.attivo ? '' : 'opacity-60'}
                                titolo={
                                  <span className="whitespace-pre-wrap text-sm font-normal">
                                    {t.testo}
                                  </span>
                                }
                                sottotitolo={
                                  <span className="flex flex-wrap items-center gap-2">
                                    {!t.attivo && <Badge tono="neutro">spento</Badge>}
                                    <span className="num">
                                      {t.volte === 1 ? 'usato una volta' : `usato ${t.volte} volte`}
                                      {t.usatoIl ? ` · ultima ${fmtDateTime(t.usatoIl)}` : ''}
                                    </span>
                                  </span>
                                }
                                elimina={
                                  <BottoneElimina
                                    azione={eliminaTesto}
                                    valori={{ id: t.id }}
                                    conferma="Eliminare questo testo?"
                                    etichetta="Elimina il testo"
                                  />
                                }
                                azioni={
                                  <>
                                    <AzioneBottone
                                      azione={accendiTesto}
                                      valori={{ id: t.id }}
                                      className="btn-ghost btn-sm"
                                    >
                                      {t.attivo ? 'Spegni' : 'Accendi'}
                                    </AzioneBottone>
                                    <BottoneModale
                                      etichetta="Modifica"
                                      icona="modifica"
                                      titolo="Modifica testo"
                                      className="btn-ghost btn-sm"
                                      larga
                                    >
                                      <FormAzione azione={salvaTesto}>
                                        <input type="hidden" name="id" value={t.id} />
                                        <CampiTesto testo={t} scatenante={m.scatenante} />
                                        <Invia icona="salva">Salva</Invia>
                                      </FormAzione>
                                    </BottoneModale>
                                  </>
                                }
                              />
                            ))}
                          </div>
                        )}
                      </CardRiga>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** I messaggi preparati e non ancora partiti, con il pulsante per mandarli. */
export function CodaWhatsapp({
  coda,
  scatenante,
}: {
  coda: { id: string; aChi: string; testo: string; scatenante: ScatenanteMessaggio }[];
  /** Solo quelli di questa occasione: il pulsante manda solo loro. */
  scatenante?: ScatenanteMessaggio;
}) {
  return (
    <>
      {coda.length === 0 ? (
        <Vuoto testo="Niente in attesa. Prepara i messaggi e li vedrai qui prima che partano." />
      ) : (
        <>
          <div className="space-y-2">
            {coda.map((m) => (
              <CardRiga
                key={m.id}
                titolo={<span className="text-sm">a {m.aChi}</span>}
                sottotitolo={<Badge tono="info">{SCATENANTI[m.scatenante].titolo}</Badge>}
                elimina={
                  /* una bozza si rifà con un clic: buttarla non chiede conferma */
                  <BottoneElimina
                    azione={eliminaBozza}
                    valori={{ id: m.id }}
                    etichetta={`Scarta il messaggio a ${m.aChi}`}
                  />
                }
              >
                <p className="whitespace-pre-wrap text-sm">{m.testo}</p>
              </CardRiga>
            ))}
          </div>

          <FormAzione azione={inviaMessaggiPronti} className="mt-4">
            {scatenante && <input type="hidden" name="scatenante" value={scatenante} />}
            <Invia icona="rilascia" attesa="Mando, uno alla volta…">
              Manda tutti ({coda.length})
            </Invia>
            <p className="text-xs text-muted">
              Partono uno alla volta, con qualche secondo in mezzo: una raffica identica è il modo
              più rapido per farsi bloccare il numero.
            </p>
          </FormAzione>
        </>
      )}
    </>
  );
}

/**
 * Il modello: quando parlare e dove scrivere.
 *
 * Il testo non è qui apposta. Questa è la parte che si sceglie una volta e si
 * cambia una volta l'anno; i modi di dirla stanno di là e si moltiplicano da
 * soli, senza portarsi dietro ogni volta la scelta del gruppo.
 */
function CampiModello({
  modello,
  gruppi,
  ordine,
}: {
  modello?: {
    titolo: string;
    scatenante: ScatenanteMessaggio;
    destinazione: string;
    gruppoId: string | null;
    attivo: boolean;
  };
  gruppi: { id: string; nome: string }[];
  ordine: ScatenanteMessaggio[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Titolo" span>
        <input
          name="titolo"
          defaultValue={modello?.titolo}
          className="input"
          placeholder="Auguri di compleanno"
          maxLength={80}
        />
        <span className="mt-1 block text-[11px] text-muted">
          Serve a ritrovarlo, ed è il nome con cui un assistente lo cerca per infilarci dentro testi
          nuovi.
        </span>
      </Campo>

      <Campo label="Quando">
        <select name="scatenante" defaultValue={modello?.scatenante ?? ordine[0]} className="input">
          {ordine.map((s) => (
            <option key={s} value={s}>
              {SCATENANTI[s].titolo}
            </option>
          ))}
        </select>
      </Campo>

      <Campo label="Dove">
        <select
          name="destinazione"
          defaultValue={modello?.destinazione ?? 'GRUPPO'}
          className="input"
        >
          <option value="GRUPPO">Nel gruppo</option>
          <option value="PERSONA">In privato alla persona</option>
        </select>
      </Campo>

      <Campo label="Gruppo diverso da quello predefinito" span>
        <select name="gruppoId" defaultValue={modello?.gruppoId ?? ''} className="input">
          <option value="">— usa il gruppo predefinito —</option>
          {gruppi.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
            </option>
          ))}
        </select>
      </Campo>

      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="attivo"
          defaultChecked={modello?.attivo ?? true}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span>
          Attivo
          <span className="block text-[11px] text-muted">
            Spento, nessuno dei suoi testi esce. È il modo di fermare tutto senza cancellare niente.
          </span>
        </span>
      </label>
    </div>
  );
}

/** I segnaposto che quel tipo di messaggio sa riempire, da tenere sott'occhio mentre si scrive. */
function Segnaposto({ scatenante }: { scatenante: ScatenanteMessaggio }) {
  return (
    <span className="mt-1 block text-[11px] text-muted">
      Segnaposto: {SCATENANTI[scatenante].segnaposto.map((v) => `{${v}}`).join(' ')} — quelli senza
      valore spariscono da soli, quindi non serve usarli tutti.
    </span>
  );
}

/**
 * L'incollata in blocco.
 *
 * È il motivo per cui i modi di fare gli auguri restano due invece di trenta:
 * passarli uno per uno da una finestra che si apre e si chiude stanca prima di
 * finirli. Trenta righe incollate in un colpo, invece, si fanno una volta sola.
 */
function CampiTesti({ scatenante }: { scatenante: ScatenanteMessaggio }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Campo label="Testi">
        <textarea
          name="testo"
          rows={10}
          className="input"
          placeholder={
            'Tanti auguri {nome}! 🎂\nBuon compleanno {callsign}, e che siano {anni} bene spesi.'
          }
        />
        <span className="mt-1 block text-[11px] text-muted">
          Una riga, un testo. Se ti servono testi che vanno a capo, separali con una riga di
          trattini <span className="num">---</span> e allora gli a capo restano.
        </span>
        <Segnaposto scatenante={scatenante} />
      </Campo>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="attivo"
          defaultChecked
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span>
          Accendili subito
          <span className="block text-[11px] text-muted">
            Il gestionale usa a turno quello fermo da più tempo, così dieci auguri di fila non sono
            dieci volte la stessa frase. Togli la spunta se li vuoi rileggere prima.
          </span>
        </span>
      </label>
    </div>
  );
}

function CampiTesto({
  testo,
  scatenante,
}: {
  testo: { testo: string; attivo: boolean };
  scatenante: ScatenanteMessaggio;
}) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Campo label="Testo">
        <textarea name="testo" rows={5} defaultValue={testo.testo} className="input" />
        <Segnaposto scatenante={scatenante} />
      </Campo>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="attivo"
          defaultChecked={testo.attivo}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span>
          Attivo
          <span className="block text-[11px] text-muted">
            Spento resta scritto ma non esce: si mette da parte una frase senza perderla.
          </span>
        </span>
      </label>
    </div>
  );
}
