import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin, isContatto, puoVedereNuovi } from '@/lib/domain';
import { comeChiamare, fmtDate, fmtEuro } from '@/lib/format';
import {
  CON_TUTTO,
  disponibile,
  eMio,
  puoFareUfficiale,
  puoVedereMerchandising,
  tuttoVenduto,
} from '@/lib/mercatino';
import { Avatar, Badge, Campo, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { CaricaFoto } from '@/components/CaricaFoto';
import { SocialAnnuncio, type CommentoLetto } from '@/components/SocialAnnuncio';
import {
  cambiaStatoAnnuncio,
  eliminaAnnuncio,
  eliminaFoto,
  eliminaVoce,
  salvaAnnuncio,
  salvaVoce,
  scegliCopertina,
  statoVoce,
} from '@/actions/mercatino';

/* eslint-disable @next/next/no-img-element */

export const dynamic = 'force-dynamic';

const ETICHETTA_VOCE: Record<string, string> = {
  DISPONIBILE: 'disponibile',
  PRENOTATA: 'prenotata',
  VENDUTA: 'venduta',
};

export default async function AnnuncioPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;

  const annuncio = await prisma.annuncio.findUnique({
    where: { id },
    include: CON_TUTTO,
  });
  if (!annuncio) notFound();

  const mio = eMio(annuncio, me.id);
  // una bozza è di chi la scrive: finché non la pubblica non esiste per nessuno
  if (annuncio.stato === 'BOZZA' && !mio) notFound();
  // il catalogo del club non si apre indovinando l'indirizzo
  if (annuncio.ufficiale && !puoVedereMerchandising(me.stato)) notFound();

  const [commenti, miPiace, mioMiPiace] = await Promise.all([
    prisma.commentoAnnuncio.findMany({
      where: { annuncioId: annuncio.id },
      orderBy: { createdAt: 'asc' },
      include: {
        utente: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            callsign: true,
            stato: true,
            fotoPath: true,
          },
        },
      },
    }),
    prisma.miPiaceAnnuncio.findMany({
      where: { annuncioId: annuncio.id },
      include: { utente: { select: { nome: true, cognome: true, callsign: true } } },
    }),
    prisma.miPiaceAnnuncio.findUnique({
      where: { annuncioId_userId: { annuncioId: annuncio.id, userId: me.id } },
      select: { userId: true },
    }),
  ]);

  const chi = comeChiamare(annuncio.venditore, {
    incarico: puoVedereNuovi(me.roles),
    diSquadra: !isContatto(annuncio.venditore.stato),
  });
  const chiuso = annuncio.stato === 'RITIRATO' || tuttoVenduto(annuncio.voci);

  return (
    <>
      <Link
        href={annuncio.ufficiale ? '/merchandising' : '/mercatino'}
        className="mb-4 inline-block text-xs text-muted hover:text-nvg"
      >
        ← {annuncio.ufficiale ? 'Merchandising' : 'Mercatino'}
      </Link>

      <Intestazione
        titolo={annuncio.titolo}
        sottotitolo={
          annuncio.pubblicatoIl ? `Pubblicato il ${fmtDate(annuncio.pubblicatoIl)}` : 'Non ancora pubblicato'
        }
        azioni={
          <>
            {mio && (
              <BottoneModale etichetta="Modifica" icona="modifica" titolo="Modifica l’annuncio" larga>
                <FormAzione azione={salvaAnnuncio}>
                  <input type="hidden" name="id" value={annuncio.id} />
                  <Campo label="Cosa vendi" span>
                    <input name="titolo" defaultValue={annuncio.titolo} className="input" maxLength={120} />
                  </Campo>
                  <Campo label="Descrizione" span>
                    <textarea
                      name="descrizione"
                      rows={4}
                      defaultValue={annuncio.descrizione ?? ''}
                      className="input"
                    />
                  </Campo>
                  {puoFareUfficiale(me.roles) && (
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="ufficiale"
                        defaultChecked={annuncio.ufficiale}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
                      />
                      <span>
                        Merchandising ufficiale del team
                        <span className="block text-[11px] text-muted">
                          Quello che si ordina finisce nella cassa della squadra. Senza questo
                          bollino la vendita è privata e il gestionale non tocca i soldi.
                        </span>
                      </span>
                    </label>
                  )}
                  <Invia icona="salva">Salva</Invia>
                </FormAzione>
              </BottoneModale>
            )}

            {mio && annuncio.stato !== 'PUBBLICATO' && (
              <AzioneBottone
                azione={cambiaStatoAnnuncio}
                valori={{ id: annuncio.id, stato: 'PUBBLICATO' }}
                icona="rilascia"
                className="btn-primary"
              >
                Pubblica
              </AzioneBottone>
            )}

            {annuncio.stato === 'PUBBLICATO' && (mio || isAdmin(me.roles)) && (
              <AzioneBottone
                azione={cambiaStatoAnnuncio}
                valori={{ id: annuncio.id, stato: 'RITIRATO' }}
                icona="annulla"
                conferma="Ritirare l’annuncio? Resta leggibile, ma segnato come ritirato."
                className="btn-ghost"
              >
                Ritira
              </AzioneBottone>
            )}

            {mio && (
              <AzioneBottone
                azione={eliminaAnnuncio}
                valori={{ id: annuncio.id }}
                icona="elimina"
                conferma="Eliminare l’annuncio e le sue foto? Non si recupera."
                className="btn-danger"
              >
                Elimina
              </AzioneBottone>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {annuncio.ufficiale && <Badge tono="info">merchandising del team</Badge>}
        {annuncio.stato === 'BOZZA' && <Badge tono="warn">bozza · la vedi solo tu</Badge>}
        {annuncio.stato === 'RITIRATO' && <Badge tono="neutro">ritirato</Badge>}
        {chiuso && annuncio.stato === 'PUBBLICATO' && <Badge tono="neutro">tutto venduto</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ---------------------------------------------------- foto */}
          <div className="card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="titolo-sezione">Foto · {annuncio.foto.length}</p>
              {mio && <CaricaFoto annuncioId={annuncio.id} quante={annuncio.foto.length} />}
            </div>

            {annuncio.foto.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                Nessuna foto. In bacheca è la prima cosa che si guarda.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {annuncio.foto.map((f) => (
                  <div
                    key={f.id}
                    className={`overflow-hidden rounded-lg border ${
                      annuncio.copertinaId === f.id ? 'border-nvg' : 'border-line'
                    }`}
                  >
                    <a href={`/api/mercatino/foto/${f.id}`} target="_blank" rel="noreferrer">
                      <img
                        src={`/api/mercatino/foto/${f.id}?m`}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                      />
                    </a>
                    {mio && (
                      <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                        {annuncio.copertinaId === f.id ? (
                          <span className="text-[11px] text-nvg">copertina</span>
                        ) : (
                          <AzioneBottone
                            azione={scegliCopertina}
                            valori={{ id: f.id }}
                            className="text-[11px] text-muted hover:text-nvg"
                          >
                            usa come copertina
                          </AzioneBottone>
                        )}
                        <AzioneBottone
                          azione={eliminaFoto}
                          valori={{ id: f.id }}
                          conferma="Eliminare la foto?"
                          className="text-[11px] text-muted hover:text-danger"
                        >
                          elimina
                        </AzioneBottone>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- voci */}
          <div className="card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="titolo-sezione">Cosa c’è</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Ogni voce ha il suo prezzo e si vende per conto suo.
                </p>
              </div>
              {mio && (
                <BottoneModale etichetta="Aggiungi voce" icona="aggiungi" titolo="Nuova voce" larga>
                  <FormVoce annuncioId={annuncio.id} ufficiale={annuncio.ufficiale} />
                </BottoneModale>
              )}
            </div>

            {annuncio.voci.length === 0 ? (
              <Vuoto testo="Nessuna voce. Senza, l’annuncio non dice un prezzo e in bacheca è una card muta." />
            ) : (
              <div className="space-y-2">
                {annuncio.voci.map((v) => (
                  <div key={v.id} className="rounded-lg border border-line bg-surface p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">
                        {v.titolo}
                        <code className="num ml-2 text-[11px] text-muted">@{v.maniglia}</code>
                      </p>
                      <p className="num font-semibold text-nvg">
                        {fmtEuro(Number(v.prezzo))}
                        {v.trattabile && (
                          <span className="ml-1 text-[11px] font-normal text-muted">trattabili</span>
                        )}
                      </p>
                    </div>

                    {v.descrizione && <p className="mt-1 text-sm text-muted">{v.descrizione}</p>}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {!v.attiva ? (
                        <Badge tono="neutro">non in vendita</Badge>
                      ) : v.natura === 'RIORDINABILE' ? (
                        <Badge tono="info">si riordina</Badge>
                      ) : (
                        <Badge tono={v.stato === 'DISPONIBILE' ? 'ok' : v.stato === 'PRENOTATA' ? 'warn' : 'neutro'}>
                          {ETICHETTA_VOCE[v.stato]}
                        </Badge>
                      )}

                      {mio && v.natura === 'PEZZO_UNICO' && (
                        <span className="flex flex-wrap gap-1">
                          {(['DISPONIBILE', 'PRENOTATA', 'VENDUTA'] as const)
                            .filter((s) => s !== v.stato)
                            .map((s) => (
                              <AzioneBottone
                                key={s}
                                azione={statoVoce}
                                valori={{ id: v.id, stato: s }}
                                className="rounded border border-line px-2 py-0.5 text-[11px] text-muted hover:border-nvgdim hover:text-ink"
                              >
                                {ETICHETTA_VOCE[s]}
                              </AzioneBottone>
                            ))}
                        </span>
                      )}

                      {mio && (
                        <span className="ml-auto flex gap-2">
                          <BottoneModale
                            etichetta="Modifica"
                            icona="modifica"
                            titolo={`Modifica ${v.titolo}`}
                            className="btn-ghost btn-sm"
                            larga
                          >
                            <FormVoce annuncioId={annuncio.id} voce={v} ufficiale={annuncio.ufficiale} />
                          </BottoneModale>
                          <AzioneBottone
                            azione={eliminaVoce}
                            valori={{ id: v.id }}
                            conferma={`Eliminare "${v.titolo}"?`}
                            className="btn-danger btn-sm"
                          >
                            Elimina
                          </AzioneBottone>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* ------------------------------------------------ commenti */}
          <SocialAnnuncio
            annuncioId={annuncio.id}
            voci={annuncio.voci
              .filter(disponibile)
              .map((v) => ({ id: v.id, titolo: v.titolo, maniglia: v.maniglia }))}
            commenti={commenti as CommentoLetto[]}
            miPiace={miPiace.map((m) => ({
              nome: comeChiamare(m.utente, { incarico: false, diSquadra: true }).nome,
            }))}
            mioMiPiace={mioMiPiace != null}
            ioSono={me.id}
            chiSono={comeChiamare(me, { incarico: false, diSquadra: true }).nome}
            puoModerare={mio || isAdmin(me.roles)}
          />
        </div>

        {/* ---------------------------------------------------- laterale */}
        <div className="space-y-6">
          <div className="card">
            <p className="titolo-sezione mb-3">Chi vende</p>
            <div className="flex items-center gap-3">
              <Avatar iniziali={chi.iniziali} fotoDi={annuncio.venditore.id} size="md" />
              <div className="min-w-0">
                <p className="truncate font-medium">{chi.nome}</p>
                {annuncio.ufficiale && (
                  <p className="text-[11px] text-muted">a nome del team</p>
                )}
              </div>
            </div>
            <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
              Per ora ci si accorda fuori dal gestionale: i messaggi privati arrivano più avanti.
            </p>
          </div>

          {annuncio.descrizione && (
            <div className="card">
              <p className="titolo-sezione mb-2">Descrizione</p>
              <p className="whitespace-pre-wrap text-sm">{annuncio.descrizione}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** Il modulo di una voce: uguale per una nuova e per una da correggere. */
function FormVoce({
  annuncioId,
  voce,
  ufficiale,
}: {
  annuncioId: string;
  voce?: {
    id: string;
    titolo: string;
    prezzo: unknown;
    trattabile: boolean;
    descrizione: string | null;
    natura: string;
    attiva: boolean;
  };
  /** Sul merchandising la natura di partenza è l'altra. */
  ufficiale: boolean;
}) {
  return (
    <FormAzione azione={salvaVoce}>
      <input type="hidden" name="annuncioId" value={annuncioId} />
      {voce && <input type="hidden" name="id" value={voce.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Cosa">
          <input
            name="titolo"
            defaultValue={voce?.titolo}
            className="input"
            maxLength={80}
            placeholder="Radio M"
          />
        </Campo>
        <Campo label="Prezzo (€)">
          <input
            name="prezzo"
            type="number"
            step="0.01"
            min="0"
            defaultValue={voce ? Number(voce.prezzo) : ''}
            className="input"
          />
        </Campo>
      </div>

      <Campo label="Dettagli" span>
        <textarea
          name="descrizione"
          rows={2}
          defaultValue={voce?.descrizione ?? ''}
          className="input"
          placeholder="Condizioni, difetti, taglia…"
        />
      </Campo>

      <Campo label="Che tipo di merce" span>
        <select
          name="natura"
          defaultValue={voce?.natura ?? (ufficiale ? 'RIORDINABILE' : 'PEZZO_UNICO')}
          className="input"
        >
          <option value="PEZZO_UNICO">Pezzo unico — venduto quello, è finita</option>
          <option value="RIORDINABILE">Si riordina — magliette, mimetiche, non finisce</option>
        </select>
      </Campo>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="trattabile"
          defaultChecked={voce?.trattabile}
          className="h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        Prezzo trattabile
      </label>

      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="attiva"
          defaultChecked={voce ? voce.attiva : true}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span>
          In vendita
          <span className="block text-[11px] text-muted">
            Togli la spunta per metterla da parte senza cancellarla: resta scritta, sparisce dal
            prezzo in bacheca, e i commenti che la nominano restano dove sono.
          </span>
        </span>
      </label>

      <Invia icona="salva">{voce ? 'Salva' : 'Aggiungi'}</Invia>
    </FormAzione>
  );
}
