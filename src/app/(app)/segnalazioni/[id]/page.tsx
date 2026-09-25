import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fmtDateTime, nomeCompleto } from '@/lib/format';
import { puoFareSondaggi } from '@/lib/sondaggi';
import { peso } from '@/lib/allegati';
import {
  etichettaStatoSegnalazione,
  gestisceSegnalazioni,
  indirizzoAllegatoSegnalazione,
  personeCitabili,
  tonoStatoSegnalazione,
  vedeSegnalazione,
} from '@/lib/segnalazioni-canali';
import { chiudiSegnalazione, rispondiSegnalazione } from '@/actions/canali-segnalazioni';
import { Badge, Intestazione } from '@/components/ui';
import { Icona } from '@/components/Icona';
import { Markdown } from '@/components/Markdown';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { AzioneBottone } from '@/components/AzioneBottone';
import { BottoneModale } from '@/components/Modale';
import { EditoreMarkdown } from '@/components/EditoreMarkdown';
import { FormSondaggio } from '@/components/FormSondaggio';
import { BadgeAnonima } from '@/components/ElencoSegnalazioni';
import { SegnaSegnalazioneVista } from '@/components/SegnaSegnalazioneVista';

export const dynamic = 'force-dynamic';

/**
 * Una segnalazione, con tutto quello che ci si è scritti dopo.
 *
 * La vedono chi l'ha scritta e chi la gestisce, nessun altro. **Se è anonima
 * il nome non compare da nessuna parte**: chi gestisce risponde a «chi ha
 * segnalato», e il gestionale recapita.
 */
export default async function SegnalazionePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const s = await prisma.segnalazioneCanale.findUnique({
    where: { id },
    include: {
      canale: { select: { id: true, titolo: true } },
      autore: { select: { nome: true, cognome: true, callsign: true } },
      allegati: { orderBy: { creatoIl: 'asc' } },
      risposte: {
        orderBy: { creataIl: 'asc' },
        include: { autore: { select: { nome: true, cognome: true, callsign: true } } },
      },
      sondaggi: { select: { id: true, domanda: true }, orderBy: { creatoIl: 'asc' } },
    },
  });
  if (!s || !vedeSegnalazione(s, me)) notFound();

  const mia = s.autoreId === me.id;
  const gestisce = gestisceSegnalazioni(me.roles) && !mia;
  const chiusa = s.stato === 'CHIUSA';
  const { persone, menzioni } = await personeCitabili(me);

  // chi ha scritto, come lo legge chi guarda: mai il nome se è anonima
  const firma = mia
    ? s.anonima
      ? 'Tu, in forma anonima'
      : 'Tu'
    : s.anonima
      ? 'Chi ha segnalato (anonimo)'
      : nomeCompleto(s.autore);

  const foto = s.allegati.filter((a) => a.mimeType.startsWith('image/'));
  const documenti = s.allegati.filter((a) => !a.mimeType.startsWith('image/'));

  return (
    <>
      <SegnaSegnalazioneVista id={s.id} />
      <Intestazione
        titolo={s.titolo}
        sottotitolo={`${s.canale.titolo} · ${fmtDateTime(s.creataIl)}`}
        azioni={
          gestisce ? (
            <>
              {puoFareSondaggi(me.roles) && (
                <BottoneModale
                  etichetta="Crea sondaggio"
                  icona="avvisi"
                  titolo="Sondaggio dalla segnalazione"
                  className="btn-ghost"
                  larga
                  compatto
                >
                  <FormSondaggio
                    daSegnalazione={{
                      id: s.id,
                      domanda: s.titolo,
                      dettaglio: '',
                      foto: foto.map((f) => ({
                        id: f.id,
                        nome: f.fileName,
                        indirizzo: indirizzoAllegatoSegnalazione(f.id),
                      })),
                    }}
                  />
                </BottoneModale>
              )}
              <AzioneBottone
                azione={chiudiSegnalazione}
                valori={{ id: s.id, chiudi: chiusa ? '0' : '1' }}
                icona={chiusa ? 'riapri' : 'concludi'}
                className="btn-ghost"
                conferma={
                  chiusa
                    ? undefined
                    : 'Chiudere la segnalazione? Chi l’ha scritta riceve un avviso, e non ci si scrive più finché non la riapri.'
                }
              >
                {chiusa ? 'Riapri' : 'Chiudi'}
              </AzioneBottone>
            </>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-3xl space-y-4">
        <article className="card">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tono={tonoStatoSegnalazione[s.stato]}>
              {etichettaStatoSegnalazione[s.stato]}
            </Badge>
            {s.anonima ? (
              <BadgeAnonima />
            ) : (
              <Badge tono="neutro">
                <Icona nome="profilo" size={11} /> col nome
              </Badge>
            )}
            <span className="text-xs text-muted">{firma}</span>
          </div>

          <Markdown testo={s.testo} menzioni={menzioni} />

          {foto.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {foto.map((f) => (
                <a
                  key={f.id}
                  href={indirizzoAllegatoSegnalazione(f.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-md border border-line"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={indirizzoAllegatoSegnalazione(f.id)}
                    alt={f.fileName}
                    className="aspect-square w-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}
          {documenti.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {documenti.map((d) => (
                <li key={d.id}>
                  <a
                    href={indirizzoAllegatoSegnalazione(d.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-nvg hover:underline"
                  >
                    <Icona nome="allegato" size={14} /> {d.fileName}
                    <span className="num text-xs text-muted">{peso(d.fileSize)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {s.sondaggi.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-1.5 text-xs text-muted">Ne è nato</p>
              {s.sondaggi.map((q) => (
                <Link
                  key={q.id}
                  href={`/sondaggi/${q.id}`}
                  className="flex items-center gap-2 text-sm text-nvg hover:underline"
                >
                  <Icona nome="avvisi" size={14} /> {q.domanda}
                </Link>
              ))}
            </div>
          )}
        </article>

        {/* il filo: le risposte di chi gestisce a destra, quelle di chi ha
            segnalato a sinistra — come una chat, perché è una chat */}
        {s.risposte.length > 0 && (
          <div className="space-y-3">
            {s.risposte.map((r) => {
              const mieRisposta = r.autoreId === me.id;
              const chi = mieRisposta
                ? 'Tu'
                : r.daGestore
                  ? nomeCompleto(r.autore)
                  : s.anonima
                    ? 'Chi ha segnalato (anonimo)'
                    : nomeCompleto(r.autore);
              return (
                <div
                  key={r.id}
                  className={`max-w-[92%] rounded-lg border px-4 py-3 ${
                    r.daGestore
                      ? 'ml-auto border-nvg/30 bg-nvg/5'
                      : 'mr-auto border-line bg-surface'
                  }`}
                >
                  <p className="mb-1.5 text-xs text-muted">
                    <span className={r.daGestore ? 'text-nvg' : 'text-ink'}>{chi}</span>
                    {r.daGestore && ' · gestione'} ·{' '}
                    <span className="num">{fmtDateTime(r.creataIl)}</span>
                  </p>
                  <Markdown testo={r.testo} menzioni={menzioni} />
                </div>
              );
            })}
          </div>
        )}

        {chiusa ? (
          <p className="rounded-md border border-line bg-surface2 px-4 py-3 text-sm text-muted">
            La segnalazione è chiusa{s.chiusaIl ? ` dal ${fmtDateTime(s.chiusaIl)}` : ''}.{' '}
            {gestisce ? 'Riaprila per scriverci ancora.' : 'Se c’è altro da dire, aprine una nuova.'}
          </p>
        ) : (
          <div className="card">
            <p className="titolo-sezione mb-3">
              {gestisce ? (s.anonima ? 'Rispondi a chi ha segnalato' : 'Rispondi') : 'Aggiungi'}
            </p>
            {/* la chiave cambia a ogni risposta: il modulo torna vuoto */}
            <FormAzione key={s.risposte.length} azione={rispondiSegnalazione}>
              <input type="hidden" name="id" value={s.id} />
              <EditoreMarkdown
                nome="testo"
                righe={4}
                persone={persone}
                aiuto={false}
                segnaposto={
                  gestisce && s.anonima
                    ? 'La risposta arriva a chi ha segnalato, senza che tu sappia chi è.'
                    : 'Scrivi qui. Con @ nomini una persona: non riceve nessun avviso.'
                }
              />
              <Invia icona="commento">Invia</Invia>
            </FormAzione>
          </div>
        )}
      </div>
    </>
  );
}
