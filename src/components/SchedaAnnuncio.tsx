import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin, isContatto, puoModerareChat, puoVedereNuovi } from '@/lib/domain';
import { comeChiamare, fmtDate, fmtEuro } from '@/lib/format';
import {
  CON_TUTTO,
  type Giacenza,
  disponibile,
  eMio,
  giacenzaDi,
  ordinabile,
  puoFareUfficiale,
  puoVedereMerchandising,
  tuttoVenduto,
} from '@/lib/mercatino';
import { Avatar, Badge, Campo, Dato, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { ElencoOrdinabile } from '@/components/ElencoOrdinabile';
import { CaricaFoto } from '@/components/CaricaFoto';
import { AggiungiAlCarrello } from '@/components/AggiungiAlCarrello';
import { eliminaCarico, registraCarico } from '@/actions/magazzino';
import { SocialAnnuncio, type CommentoLetto } from '@/components/SocialAnnuncio';
import {
  cambiaStatoAnnuncio,
  eliminaAnnuncio,
  eliminaFoto,
  eliminaVoce,
  salvaAnnuncio,
  ordinaVoci,
  salvaVoce,
  scegliCopertina,
  statoVoce,
} from '@/actions/mercatino';

/* eslint-disable @next/next/no-img-element */

const ETICHETTA_VOCE: Record<string, string> = {
  DISPONIBILE: 'disponibile',
  PRENOTATA: 'prenotata',
  VENDUTA: 'venduta',
};

/**
 * La scheda di un annuncio, usata da due indirizzi.
 *
 * L'usato e il merchandising sono due voci di menu diverse, e chi apre un
 * articolo del team deve restare dentro il merchandising: con un indirizzo
 * solo il menu si spostava su *Usato* ogni volta che si apriva una maglietta.
 * Il contenuto però è lo stesso, quindi sta scritto una volta e chi arriva
 * dalla porta sbagliata viene mandato a quella giusta — i vecchi link
 * continuano a funzionare.
 */
export async function SchedaAnnuncio({
  id,
  da,
}: {
  id: string;
  da: 'mercatino' | 'merchandising';
}) {
  const me = await requireUser();

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
  // ognuno a casa sua: l'indirizzo dice anche quale voce di menu si accende
  if (annuncio.ufficiale && da !== 'merchandising') redirect(`/merchandising/${id}`);
  if (!annuncio.ufficiale && da !== 'mercatino') redirect(`/mercatino/${id}`);

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

  // Si ordina solo dal catalogo del team, e solo quello che è pubblicato: una
  // vendita privata fra due soci non passa dai soldi del gestionale.
  const siOrdina = annuncio.ufficiale && annuncio.stato === 'PUBBLICATO';
  const ids = annuncio.voci.map((v) => v.id);

  // Quante ne ho già ordinate e non ancora ricevute, e quante ne ho adesso nel
  // carrello: senza, il secondo ordine per sbaglio è questione di giorni.
  const [ordinate, carrello] = siOrdina
    ? await Promise.all([
        prisma.rigaOrdine.findMany({
          where: {
            voceId: { in: ids },
            ordine: { userId: me.id, stato: { in: ['RACCOLTA', 'ORDINATO', 'ARRIVATO'] } },
          },
          select: { voceId: true, quantita: true },
        }),
        prisma.rigaCarrello.findMany({
          where: { userId: me.id, voceId: { in: ids } },
          select: { voceId: true, quantita: true },
        }),
      ])
    : [[], []];

  const giaOrdinate = new Map<string, number>();
  for (const r of ordinate) giaOrdinate.set(r.voceId, (giaOrdinate.get(r.voceId) ?? 0) + r.quantita);
  const nelCarrello = new Map(carrello.map((r) => [r.voceId, r.quantita]));

  // Il magazzino: quello che il team compra in blocco e tiene in casa. Non
  // entra nel giro di raccolta — non c'è niente da chiedere al fornitore a
  // ogni ordine — ma ha una giacenza che scende, e finita è finita.
  const inMagazzino = annuncio.voci.filter((v) => v.aMagazzino);
  const [carichi, prenotate] = inMagazzino.length
    ? await Promise.all([
        prisma.caricoMagazzino.findMany({
          where: { voceId: { in: inMagazzino.map((v) => v.id) } },
          orderBy: { compratoIl: 'desc' },
        }),
        prisma.rigaOrdine.findMany({
          where: {
            voceId: { in: inMagazzino.map((v) => v.id) },
            ordine: { stato: { not: 'ANNULLATO' } },
          },
          select: { voceId: true, quantita: true, ordine: { select: { stato: true } } },
        }),
      ])
    : [[], []];

  const magazzino = new Map(
    inMagazzino.map((v) => {
      const suoi = carichi.filter((c) => c.voceId === v.id);
      return [
        v.id,
        {
          carichi: suoi.map((c) => ({
            id: c.id,
            quantita: c.quantita,
            costoUnitario: Number(c.costoUnitario),
            fornitore: c.fornitore,
            compratoIl: c.compratoIl,
          })),
          conto: giacenzaDi(
            suoi,
            prenotate
              .filter((r) => r.voceId === v.id)
              .map((r) => ({ quantita: r.quantita, stato: r.ordine.stato })),
          ),
        },
      ];
    }),
  );

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
            ) : mio && annuncio.voci.length > 1 ? (
              /* l'ordine è una scelta di chi vende — la S prima della XL, il
                 pezzo importante in cima — e si dà trascinando dalla maniglia */
              <ElencoOrdinabile
                azione={ordinaVoci}
                valori={{ annuncioId: annuncio.id }}
                elementi={annuncio.voci.map((v) => ({
                  id: v.id,
                  contenuto: (
                    <RigaVoce
                      voce={v}
                      mio={mio}
                      annuncio={annuncio}
                      siOrdina={siOrdina}
                      gia={giaOrdinate.get(v.id) ?? 0}
                      inCarrello={nelCarrello.get(v.id) ?? 0}
                      magazzino={magazzino.get(v.id)}
                    />
                  ),
                }))}
              />
            ) : (
              <div className="space-y-2">
                {annuncio.voci.map((v) => (
                  <RigaVoce
                    key={v.id}
                    voce={v}
                    mio={mio}
                    annuncio={annuncio}
                    siOrdina={siOrdina}
                    gia={giaOrdinate.get(v.id) ?? 0}
                    inCarrello={nelCarrello.get(v.id) ?? 0}
                    magazzino={magazzino.get(v.id)}
                  />
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
            puoModerare={mio || puoModerareChat(me.roles)}
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

type VoceInRiga = {
  id: string;
  titolo: string;
  maniglia: string;
  prezzo: unknown;
  trattabile: boolean;
  descrizione: string | null;
  natura: string;
  attiva: boolean;
  aMagazzino: boolean;
  stato: string;
};

type Carico = {
  id: string;
  quantita: number;
  costoUnitario: number;
  fornitore: string | null;
  compratoIl: Date;
};

type Scorta = { carichi: Carico[]; conto: Giacenza };

/**
 * Una voce dell'annuncio.
 *
 * Sta fuori dalla pagina perché la usano due elenchi: quello fermo che vedono
 * tutti e quello che chi vende può trascinare. Scriverla due volte vorrebbe
 * dire correggere due volte il badge che si dimentica.
 */
function RigaVoce({
  voce: v,
  mio,
  annuncio,
  siOrdina,
  gia,
  inCarrello,
  magazzino,
}: {
  voce: VoceInRiga;
  mio: boolean;
  annuncio: { id: string; ufficiale: boolean };
  /** Vero sul catalogo del team pubblicato: è l'unica roba che si ordina. */
  siOrdina: boolean;
  /** Quante ne ha già ordinate chi guarda, e non ancora ricevute. */
  gia: number;
  /** Quante ne ha già nel carrello adesso. */
  inCarrello: number;
  /** Solo per le voci tenute in casa: quante ce ne sono e quanto costano. */
  magazzino?: Scorta;
}) {
  const restano = magazzino?.conto.disponibili ?? null;
  const finita = restano !== null && restano <= 0;
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {v.titolo}
          <code className="num ml-2 text-[11px] text-muted">@{v.maniglia}</code>
        </p>
        <p className="num font-semibold text-nvg">
          {fmtEuro(Number(v.prezzo))}
          {v.trattabile && <span className="ml-1 text-[11px] font-normal text-muted">trattabili</span>}
        </p>
      </div>

      {v.descrizione && <p className="mt-1 text-sm text-muted">{v.descrizione}</p>}

      {mio && magazzino && (
        <p className="num mt-1 text-[11px] text-muted">
          magazzino: {magazzino.conto.caricate} caricate · {magazzino.conto.impegnate} impegnate ·{' '}
          {magazzino.conto.consegnate} consegnate
          {magazzino.conto.costoMedio !== null &&
            ` · costo medio ${fmtEuro(magazzino.conto.costoMedio)}`}
        </p>
      )}

      {/* senza questo il secondo ordine per sbaglio è questione di giorni */}
      {(gia > 0 || inCarrello > 0) && (
        <p className="num mt-1 text-[11px] text-nvg">
          {gia > 0 && `ne hai già ordinate ${gia}`}
          {gia > 0 && inCarrello > 0 && ' · '}
          {inCarrello > 0 && `${inCarrello} nel carrello`}
        </p>
      )}

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

        {/* quello che sta in casa finisce: dirlo prima evita di prometterlo */}
        {restano !== null &&
          (finita ? (
            <Badge tono="warn">finita</Badge>
          ) : (
            <Badge tono="ok">ne restano {restano}</Badge>
          ))}

        {siOrdina && ordinabile(v) && !finita && (
          <AggiungiAlCarrello voceId={v.id} titolo={v.titolo} />
        )}
      </div>

      {/* Chi vende ha la sua riga, sotto e staccata: comprare e amministrare
          sono due gesti diversi, e in mezzo a Aggiungi ci finiva un Elimina
          rosso a un centimetro dal carrello. */}
      {mio && (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-2">
          {magazzino && (
            <BottoneModale
              etichetta="Magazzino"
              icona="carica"
              titolo={`Magazzino · ${v.titolo}`}
              className="btn-ghost btn-sm"
              larga
            >
              <FormCarico voce={v} scorta={magazzino} />
            </BottoneModale>
          )}
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
        </div>
      )}
    </div>
  );
}

/**
 * Il magazzino di una voce: quanto ce n'è, e i carichi che ce l'hanno messa.
 *
 * I carichi si sommano invece di aggiornare un totale, così resta la storia
 * dei prezzi pagati: una patch comprata l'anno scorso a 1,50 e una comprata
 * adesso a 2,10 raccontano due cose diverse, e il totale da solo non le
 * direbbe.
 */
function FormCarico({ voce, scorta }: { voce: VoceInRiga; scorta: Scorta }) {
  const guadagno =
    scorta.conto.costoMedio !== null ? Number(voce.prezzo) - scorta.conto.costoMedio : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato etichetta="Disponibili" valore={scorta.conto.disponibili} />
        <Dato etichetta="Impegnate" valore={scorta.conto.impegnate} />
        <Dato
          etichetta="Costo medio"
          valore={scorta.conto.costoMedio === null ? '—' : fmtEuro(scorta.conto.costoMedio)}
        />
        <Dato
          etichetta="Margine al pezzo"
          valore={guadagno === null ? '—' : fmtEuro(guadagno)}
        />
      </div>

      <FormAzione azione={registraCarico}>
        <input type="hidden" name="voceId" value={voce.id} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Quanti pezzi">
            <input name="quantita" type="number" min="1" className="input" placeholder="100" />
          </Campo>
          <Campo label="Costo di un pezzo (€)">
            <input
              name="costoUnitario"
              type="number"
              step="0.01"
              min="0"
              className="input"
              placeholder="1.50"
            />
          </Campo>
          <Campo label="Da chi">
            <input name="fornitore" className="input" maxLength={80} placeholder="Fornitore" />
          </Campo>
          <Campo label="Quando">
            <input name="compratoIl" type="date" className="input" />
          </Campo>
        </div>
        <Campo label="Note" span>
          <input name="note" className="input" maxLength={140} />
        </Campo>
        <Invia icona="carica">Carica</Invia>
      </FormAzione>

      {scorta.carichi.length > 0 && (
        <div>
          <p className="titolo-sezione mb-2">Carichi</p>
          <div className="space-y-1">
            {scorta.carichi.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-2 rounded border border-line px-3 py-1.5 text-sm"
              >
                <span className="num font-medium">{c.quantita}</span>
                <span className="num text-muted">× {fmtEuro(c.costoUnitario)}</span>
                <span className="num text-[11px] text-muted">
                  {fmtDate(c.compratoIl)}
                  {c.fornitore && ` · ${c.fornitore}`}
                </span>
                <AzioneBottone
                  azione={eliminaCarico}
                  valori={{ id: c.id }}
                  conferma="Eliminare il carico? La giacenza si ricalcola."
                  className="ml-auto text-[11px] text-muted transition-colors hover:text-danger"
                >
                  elimina
                </AzioneBottone>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
    aMagazzino: boolean;
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

      {/* solo sul catalogo del team: fra due soci non c'è niente da tenere in
          magazzino, si vende quello che si ha in mano */}
      {ufficiale && (
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="aMagazzino"
            defaultChecked={voce?.aMagazzino}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
          />
          <span>
            La tengo in magazzino
            <span className="block text-[11px] text-muted">
              Per la roba comprata in blocco — le patch, gli adesivi — che si consegna man mano.
              Non entra nel «da ordinare al fornitore», ma ha una giacenza: quando finisce non si
              può più ordinare finché non ne arrivano altre.
            </span>
          </span>
        </label>
      )}

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
