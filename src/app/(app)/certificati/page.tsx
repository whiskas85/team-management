import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  GIORNI_PREAVVISO_SCADENZA,
  statoEffettivo,
  tonoCertificato,
  vedeAreaTesseramento,
} from '@/lib/domain';
import { fmtDate, giorniA, umanizza } from '@/lib/format';
import { Avviso, Badge, Campo, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { DateCertificato } from '@/components/DateCertificato';
import { LineaCertificato } from '@/components/LineaCertificato';
import { Icona } from '@/components/Icona';
import { caricaCertificato, eliminaCertificato } from '@/actions/certificati';

export const dynamic = 'force-dynamic';

/**
 * Il proprio certificato medico.
 *
 * La domanda a cui questa pagina risponde è una sola: **sono a posto, e fino a
 * quando?** Per questo in cima c'è il certificato che vale adesso, con il tipo
 * — agonistico o no, che non è un dettaglio: dove serve il primo, il secondo
 * vale come non averlo — e la linea che mostra quanto manca. Il resto, i
 * caricamenti vecchi e quelli rifiutati, sta sotto: è storia.
 */
export default async function MieiCertificatiPage() {
  const me = await requireUser();
  // il certificato serve solo a chi è tesserato: per i nuovi la sezione non esiste
  if (!vedeAreaTesseramento(me.stato)) redirect('/profilo');

  const certificati = await prisma.medicalCertificate.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    include: { reviewedBy: { select: { nome: true, cognome: true } } },
  });

  const conStato = certificati.map((c) => ({ ...c, stato: statoEffettivo(c) }));
  // quello che conta è il valido che scade più tardi: se ce ne sono due, vale
  // il più lungo
  const valido = conStato
    .filter((c) => c.stato === 'VALIDO' && c.scadeIl)
    .sort((a, b) => new Date(b.scadeIl!).getTime() - new Date(a.scadeIl!).getTime())[0];
  const inAttesa = conStato.find((c) => c.stato === 'IN_ATTESA');
  const altri = conStato.filter((c) => c.id !== valido?.id);

  const giorni = valido ? giorniA(valido.scadeIl) : null;
  const inScadenza = giorni !== null && giorni <= GIORNI_PREAVVISO_SCADENZA;

  const modulo = (
    <FormAzione azione={caricaCertificato}>
      <Campo label="Tipo">
        <select name="tipo" className="input" defaultValue="NON_AGONISTICO">
          <option value="NON_AGONISTICO">Non agonistico</option>
          <option value="AGONISTICO">Agonistico</option>
        </select>
      </Campo>

      <DateCertificato />

      <Campo label="File (PDF o foto) *">
        <input
          type="file"
          name="file"
          required
          accept="application/pdf,image/*"
          className="input file:mr-3 file:rounded file:border-0 file:bg-nvg/15 file:px-3 file:py-1 file:text-nvg"
        />
      </Campo>

      <Campo label="Note">
        <textarea name="note" rows={2} className="input" />
      </Campo>

      <Invia className="btn-primary w-full justify-center" attesa="Caricamento…" icona="carica">
        Carica certificato
      </Invia>
      <p className="text-xs text-muted">
        Massimo 10 MB · PDF, JPG, PNG o WEBP. Resta in attesa finché l’amministrazione non lo
        approva.
      </p>
    </FormAzione>
  );

  return (
    <>
      <Intestazione
        titolo="Il mio certificato medico"
        sottotitolo="Senza un certificato valido non si scende in campo"
        azioni={
          <BottoneModale
            etichetta="Aggiungi certificato"
            icona="carica"
            titolo="Nuovo certificato"
          >
            {modulo}
          </BottoneModale>
        }
      />

      {/* --------------------------------------------- quello che vale adesso */}
      {valido ? (
        <div className={`card mb-6 ${inScadenza ? 'border-l-2 border-l-warn' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="titolo-sezione">Certificato in corso</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                {valido.tipo === 'AGONISTICO' ? 'Agonistico' : 'Non agonistico'}
                {valido.tipo === 'AGONISTICO' && <Badge tono="ok">copre tutto</Badge>}
              </p>
              <p className="mt-1 text-sm text-muted">
                {valido.tipo === 'AGONISTICO'
                  ? 'Vale per gare e tornei, e per tutto il resto.'
                  : 'Vale per allenamenti e partite ordinarie. Dove serve l’agonistico non basta.'}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`num text-3xl font-semibold ${
                  inScadenza ? 'text-warn' : 'text-nvg'
                }`}
              >
                {giorni}
              </p>
              <p className="text-[11px] text-muted">
                {giorni === 1 ? 'giorno alla scadenza' : 'giorni alla scadenza'}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <LineaCertificato rilasciatoIl={valido.rilasciatoIl} scadeIl={valido.scadeIl!} />
          </div>

          {inScadenza && (
            <p className="mt-4 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
              Sta per scadere: prenota la visita adesso. Fra {giorni} giorni, senza il rinnovo, non
              potrai giocare.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <a
              href={`/api/certificati/${valido.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost btn-sm"
            >
              <Icona nome="apri" size={15} /> Apri l’allegato
            </a>
            <span className="text-xs text-muted">
              caricato il {fmtDate(valido.createdAt)}
              {valido.reviewedBy &&
                ` · approvato da ${valido.reviewedBy.nome} ${valido.reviewedBy.cognome}`}
            </span>
            <AzioneBottone
              azione={eliminaCertificato}
              valori={{ id: valido.id }}
              conferma="Eliminare il certificato? Senza, per il gestionale non sei più in regola."
              className="ml-auto text-[11px] text-muted transition-colors hover:text-danger"
            >
              elimina
            </AzioneBottone>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <Avviso tono={inAttesa ? 'info' : 'danger'}>
            {inAttesa
              ? 'Il certificato che hai caricato è in attesa: lo guarda l’amministrazione, di solito in un paio di giorni.'
              : 'Non hai un certificato valido: senza, non puoi scendere in campo. Caricalo con «Aggiungi certificato».'}
          </Avviso>
        </div>
      )}

      {/* --------------------------------------------- quale serve */}
      <div className="mb-6 rounded-lg border border-line bg-surface p-4">
        <p className="titolo-sezione mb-2">Quale certificato serve</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-line bg-surface2 px-3 py-2">
            <p className="text-sm font-medium">Non agonistico</p>
            <p className="mt-1 text-xs text-muted">
              Visita di base dal medico di famiglia o dallo sportivo. Basta per allenamenti e
              partite ordinarie.
            </p>
          </div>
          <div className="rounded-md border border-nvg/30 bg-nvg/5 px-3 py-2">
            <p className="text-sm font-medium text-nvg">Agonistico</p>
            <p className="mt-1 text-xs text-muted">
              Rilasciato da un medico dello sport, con elettrocardiogramma sotto sforzo. Serve per
              gare e tornei: dove è richiesto, il non agonistico <strong>non è sufficiente</strong>
              {' '}e vale come non averlo.
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Entrambi valgono 364 giorni dal rilascio. Se hai l’agonistico copri anche tutto il resto.
        </p>
      </div>

      {/* --------------------------------------------- storico */}
      <p className="titolo-sezione mb-2">Gli altri caricamenti</p>
      {altri.length === 0 ? (
        <Vuoto testo="Nient’altro: qui finiscono i certificati scaduti, quelli in attesa e quelli rifiutati." />
      ) : (
        <div className="space-y-2">
          {altri.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{umanizza(c.tipo)}</p>
                <p className="num text-[11px] text-muted">
                  {fmtDate(c.rilasciatoIl)} → {fmtDate(c.scadeIl)} · caricato il{' '}
                  {fmtDate(c.createdAt)}
                </p>
                {c.motivoRifiuto && (
                  <p className="mt-1 text-[11px] text-danger">Rifiutato: {c.motivoRifiuto}</p>
                )}
              </div>

              <span className="ml-auto flex flex-wrap items-center gap-2">
                <Badge tono={tonoCertificato[c.stato]}>{umanizza(c.stato)}</Badge>
                <a
                  href={`/api/certificati/${c.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-muted transition-colors hover:text-nvg"
                >
                  apri
                </a>
                <AzioneBottone
                  azione={eliminaCertificato}
                  valori={{ id: c.id }}
                  conferma="Eliminare questo caricamento?"
                  className="text-[11px] text-muted transition-colors hover:text-danger"
                >
                  elimina
                </AzioneBottone>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
