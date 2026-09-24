import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtDate, nomeCompleto } from '@/lib/format';
import { peso } from '@/lib/allegati';
import {
  EMOJI_BACHECA,
  REGOLE_ALLEGATO_BACHECA,
  etichettaPubblico,
  indirizzoAllegato,
  indirizzoBanner,
  moderaBacheca,
  puoCreareBacheche,
  scriveInBacheca,
  spunte,
  vedeBacheca,
} from '@/lib/bacheche';
import { chiocciole, personeSceglibili } from '@/lib/bacheche-persone';
import { Badge, Campo, Vuoto } from '@/components/ui';
import { Stellina } from '@/components/Preferiti';
import { TestataFissa } from '@/components/TestataFissa';
import { iconaBacheca } from '@/lib/icone-bacheca';
import { BottoneModale } from '@/components/Modale';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { CampoFile } from '@/components/CampoFile';
import { BottoneElimina } from '@/components/CardRiga';
import { FormBacheca } from '@/components/FormBacheca';
import { FormMessaggio, MessaggioBacheca, type DatiMessaggio } from '@/components/MessaggioBacheca';
import { SegnaBachecaLetta } from '@/components/SegnaBachecaLetta';
import { Icona } from '@/components/Icona';
import {
  caricaAllegatoBacheca,
  eliminaAllegatoBacheca,
  modificaAllegatoBacheca,
  eliminaBacheca,
} from '@/actions/bacheche';

export const dynamic = 'force-dynamic';

const chi = (u: { nome: string; cognome: string; callsign: string | null }) => nomeCompleto(u);

/**
 * Una bacheca: i messaggi, dal più recente, e i suoi documenti.
 *
 * Chi ci scrive vede anche le bozze — in cima, tratteggiate, perché sono cose
 * da finire — e sotto ogni messaggio rilasciato le spunte di chi l'ha
 * ricevuto e letto. Gli altri vedono il messaggio, le reazioni e le risposte.
 */
export default async function BachecaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();

  const b = await prisma.bacheca.findUnique({
    where: { id },
    include: {
      lettori: { select: { userId: true } },
      scrittori: { select: { userId: true } },
      moderatore: { select: { nome: true, cognome: true, callsign: true } },
      allegati: {
        orderBy: { caricatoIl: 'desc' },
        include: { caricatoDa: { select: { nome: true, cognome: true, callsign: true } } },
      },
    },
  });
  // chi non la vede non deve sapere che esiste
  if (!b || !vedeBacheca(b, me)) notFound();

  const scrive = scriveInBacheca(b, me);
  const modera = moderaBacheca(b, me);
  const configura = puoCreareBacheche(me.roles);

  const messaggi = await prisma.messaggioBacheca.findMany({
    where: {
      bachecaId: b.id,
      // le bozze le vede chi scrive qui; gli altri solo quello che è uscito
      ...(scrive ? {} : { pubblicatoIl: { not: null } }),
    },
    orderBy: [{ pubblicatoIl: { sort: 'desc', nulls: 'first' } }, { creatoIl: 'desc' }],
    include: {
      autore: { select: { nome: true, cognome: true, callsign: true } },
      reazioni: { include: { utente: { select: { nome: true, cognome: true, callsign: true } } } },
      risposte: {
        orderBy: { creataIl: 'asc' },
        include: { autore: { select: { nome: true, cognome: true, callsign: true } } },
      },
      // si leggono sempre, ma escono dalla pagina solo per chi scrive qui
      consegne: { include: { utente: { select: { nome: true, cognome: true, callsign: true } } } },
    },
  });

  const { citabili, menzioni } = await chiocciole(b, me);

  const dati: DatiMessaggio[] = messaggi.map((m) => {
    const perEmoji = new Map<string, { chi: string[]; mia: boolean }>();
    for (const r of m.reazioni) {
      const g = perEmoji.get(r.emoji) ?? { chi: [], mia: false };
      g.chi.push(chi(r.utente));
      if (r.userId === me.id) g.mia = true;
      perEmoji.set(r.emoji, g);
    }
    const consegne = m.consegne;
    return {
      id: m.id,
      titolo: m.titolo,
      testo: m.testo,
      banner: m.bannerPath ? indirizzoBanner(m.id) : null,
      autore: chi(m.autore),
      creatoIl: m.creatoIl,
      pubblicatoIl: m.pubblicatoIl,
      modificatoIl: m.modificatoIl,
      mio: m.autoreId === me.id,
      puoModerare: modera,
      // le spunte le vede chi scrive in questa bacheca: sono il suo strumento
      spunte: scrive && m.pubblicatoIl ? spunte(consegne) : null,
      consegne: scrive
        ? consegne.map((c) => ({
            nome: chi(c.utente),
            conPush: c.conPush,
            inviataIl: c.inviataIl,
            ricevutaIl: c.ricevutaIl,
            lettaIl: c.lettaIl,
          }))
        : [],
      reazioni: EMOJI_BACHECA.filter((e) => perEmoji.has(e)).map((e) => ({ emoji: e, ...perEmoji.get(e)! })),
      risposte: m.risposte.map((r) => ({
        id: r.id,
        autore: chi(r.autore),
        testo: r.testo,
        creataIl: r.creataIl,
        mia: r.autoreId === me.id,
      })),
    };
  });

  return (
    <>
      <SegnaBachecaLetta bachecaId={b.id} />

      <Link href="/bacheca" className="mb-4 inline-block text-xs text-muted hover:text-nvg">
        ← Bacheche
      </Link>

      {/* Il titolo resta in cima mentre si scorre, con accanto quello che si
          fa: scrivere e configurare. Sul telefono i due pulsanti sono solo
          l'icona, perché il titolo ha bisogno della riga. */}
      <TestataFissa>
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Icona nome={iconaBacheca(b.icona)} size={20} />
            <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight sm:text-2xl">{b.nome}</h1>
            <Stellina />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {scrive && (
              <BottoneModale
                etichetta="Scrivi"
                icona="aggiungi"
                titolo={`Nuovo messaggio in ${b.nome}`}
                larga
                compatto
              >
                <FormMessaggio bachecaId={b.id} citabili={citabili} />
              </BottoneModale>
            )}
            {configura && (
              <BottoneModale
                etichetta="Configura"
                icona="impostazioni"
                titolo="Configura la bacheca"
                className="btn-ghost"
                larga
                compatto
              >
                <FormBacheca
                  persone={await personeSceglibili()}
                  moderatorePredefinito={me.id}
                  bacheca={{
                    id: b.id,
                    nome: b.nome,
                    descrizione: b.descrizione,
                    pubblico: b.pubblico,
                    icona: b.icona,
                    moderatoreId: b.moderatoreId,
                    lettori: b.lettori.map((l) => l.userId),
                    scrittori: b.scrittori.map((s) => s.userId),
                  }}
                />
                <div className="mt-6 border-t border-line pt-4">
                  <BottoneElimina
                    azione={eliminaBacheca}
                    valori={{ id: b.id }}
                    conferma={`Eliminare «${b.nome}» con tutti i messaggi, le risposte e i documenti? Non si torna indietro.`}
                    etichetta="Elimina la bacheca"
                  />
                </div>
              </BottoneModale>
            )}
          </div>
        </div>
      </TestataFissa>
      <p className="mb-6 text-sm text-muted">
        {[b.descrizione, etichettaPubblico[b.pubblico], b.moderatore ? `modera ${chi(b.moderatore)}` : null]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* ------------------------------------------------------ messaggi */}
        <div className="min-w-0 space-y-4">
          {dati.length === 0 ? (
            <Vuoto
              testo={
                scrive
                  ? 'Nessun messaggio. Scrivine uno: nasce bozza, e parte quando lo rilasci.'
                  : 'Qui non è ancora stato scritto niente.'
              }
            />
          ) : (
            dati.map((m) => (
              <MessaggioBacheca
                key={m.id}
                bachecaId={b.id}
                m={m}
                menzioni={menzioni}
                citabili={citabili}
                emoji={EMOJI_BACHECA}
              />
            ))
          )}
        </div>

        {/* ------------------------------------------------------ documenti */}
        <aside className="space-y-3">
          <div className="card">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="titolo-sezione">Documenti</p>
              {scrive && (
                <BottoneModale etichetta="Carica" icona="carica" titolo="Carica un documento" className="btn-ghost btn-sm">
                  <FormAzione azione={caricaAllegatoBacheca}>
                    <input type="hidden" name="bachecaId" value={b.id} />
                    <CampoFile
                      label="Documento *"
                      required
                      estensioni={REGOLE_ALLEGATO_BACHECA.estensioni}
                      maxBytes={REGOLE_ALLEGATO_BACHECA.maxBytes ?? 20 * 1024 * 1024}
                      aiuto="PDF, Markdown, testo, immagini, Word, Excel o PowerPoint. Poi lo richiami nei messaggi con la chiocciola."
                    />
                    <CampiDocumento />
                    <Invia icona="carica">Carica</Invia>
                  </FormAzione>
                </BottoneModale>
              )}
            </div>
            {b.allegati.length === 0 ? (
              <p className="text-xs text-muted">Nessun documento.</p>
            ) : (
              <ul className="space-y-2">
                {b.allegati.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-sm">
                    <Icona nome="allegato" size={15} />
                    <div className="min-w-0 flex-1">
                      <a
                        href={indirizzoAllegato(a.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="block break-words hover:text-nvg"
                      >
                        {a.titolo ?? a.fileName}
                      </a>
                      {a.descrizione && (
                        <span className="mt-0.5 block whitespace-pre-line break-words text-xs text-ink/80">
                          {a.descrizione}
                        </span>
                      )}
                      <span className="block text-[11px] text-muted num">
                        @{a.maniglia} · {peso(a.fileSize)} · {fmtDate(a.caricatoIl)}
                      </span>
                    </div>
                    {(a.caricatoDaId === me.id || modera) && (
                      <BottoneModale
                        etichetta="Modifica"
                        icona="modifica"
                        titolo={`Modifica «${a.titolo ?? a.fileName}»`}
                        className="btn-ghost btn-sm"
                        soloIcona
                      >
                        <FormAzione azione={modificaAllegatoBacheca}>
                          <input type="hidden" name="id" value={a.id} />
                          <CampiDocumento documento={a} />
                          <p className="text-xs text-muted">
                            Oggi si richiama con @{a.maniglia}. Cambiando il nome cambia anche la
                            chiocciola, e i messaggi che la citano si aggiornano da soli.
                          </p>
                          <Invia icona="salva">Salva</Invia>
                        </FormAzione>
                      </BottoneModale>
                    )}
                    {(a.caricatoDaId === me.id || modera) && (
                      <BottoneElimina
                        azione={eliminaAllegatoBacheca}
                        valori={{ id: a.id }}
                        conferma={`Togliere «${a.titolo ?? a.fileName}»? I messaggi che lo citano mostreranno solo il nome.`}
                        etichetta={`Togli ${a.fileName}`}
                        piccolo
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {scrive && (
            <p className="px-1 text-xs text-muted">
              <Badge tono="info">✓✓</Badge> sotto ogni messaggio: chi l’ha ricevuto sul telefono e chi
              l’ha letto. Le vedi perché scrivi qui.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

/** Come si chiamerà il documento e cos'è: al caricamento e quando lo si corregge. */
function CampiDocumento({
  documento,
}: {
  documento?: { titolo: string | null; descrizione: string | null; fileName: string };
}) {
  return (
    <>
      <Campo label="Come si chiamerà" span>
        <input
          name="titolo"
          maxLength={120}
          defaultValue={documento?.titolo ?? ''}
          className="input"
          placeholder={documento?.fileName ?? 'es. Regolamento 2026 — vuoto, vale il nome del file'}
        />
      </Campo>
      <Campo label="Descrizione" span>
        <textarea
          name="descrizione"
          rows={2}
          maxLength={500}
          defaultValue={documento?.descrizione ?? ''}
          className="input"
          placeholder="Cos'è, e perché lo si trova qui"
        />
      </Campo>
    </>
  );
}
