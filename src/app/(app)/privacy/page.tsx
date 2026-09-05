import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CONSERVAZIONE, DIRITTI, FINALITA, TITOLARE, VERSIONE_PRIVACY } from '@/lib/gdpr';
import { fmtDate } from '@/lib/format';
import { Badge, Intestazione } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { Icona } from '@/components/Icona';
import { chiediCancellazione } from '@/actions/operatori';

export default async function PrivacyPage() {
  const me = await requireUser();
  const utente = await prisma.user.findUniqueOrThrow({
    where: { id: me.id },
    select: {
      privacyAccettataIl: true,
      privacyVersione: true,
      consensoImmagini: true,
      consensoComunicaz: true,
      cancellazioneChiesta: true,
    },
  });

  return (
    <>
      <Intestazione
        titolo="Informativa privacy"
        sottotitolo={`Titolare del trattamento: ${TITOLARE} · versione ${VERSIONE_PRIVACY}`}
      />

      <div className="mb-6 card">
        <p className="titolo-sezione mb-3">La tua posizione</p>
        <div className="flex flex-wrap gap-2">
          <Badge tono={utente.privacyAccettataIl ? 'ok' : 'danger'}>
            {utente.privacyAccettataIl
              ? `Informativa accettata il ${fmtDate(utente.privacyAccettataIl)}`
              : 'Informativa non ancora accettata'}
          </Badge>
          <Badge tono={utente.consensoImmagini ? 'ok' : 'neutro'}>
            Immagini: {utente.consensoImmagini ? 'consenso prestato' : 'negato'}
          </Badge>
          <Badge tono={utente.consensoComunicaz ? 'ok' : 'neutro'}>
            Comunicazioni: {utente.consensoComunicaz ? 'consenso prestato' : 'negato'}
          </Badge>
        </div>
        <p className="mt-3 text-xs text-muted">
          I consensi facoltativi si modificano in ogni momento dalla{' '}
          <Link href="/profilo" className="text-nvg hover:underline">
            tua pagina
          </Link>
          .
        </p>
      </div>

      {/* ------------------------------------------------ finalità */}
      <div className="space-y-4">
        {FINALITA.map((f) => (
          <div key={f.titolo} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">{f.titolo}</h2>
              <Badge tono={f.obbligatorio ? 'info' : 'neutro'}>
                {f.obbligatorio ? 'Necessario' : 'Facoltativo'}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-ink/90">{f.testo}</p>
            <p className="mt-2 text-xs text-muted">Base giuridica: {f.base}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card">
          <p className="titolo-sezione mb-2">Per quanto tempo</p>
          <p className="text-sm text-ink/90">{CONSERVAZIONE}</p>
        </div>
        <div className="card">
          <p className="titolo-sezione mb-2">I tuoi diritti</p>
          <p className="text-sm text-ink/90">{DIRITTI}</p>
        </div>
      </div>

      {/* ------------------------------------------------ accesso e oblio */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card">
          <p className="titolo-sezione mb-2">Scarica i tuoi dati</p>
          <p className="mb-3 text-sm text-muted">
            Esportazione completa in formato JSON: anagrafica, consensi, iscrizioni, certificati,
            pagamenti e partecipazioni.
          </p>
          <a href="/api/gdpr/esporta" className="btn-ghost btn-sm">
            <Icona nome="scarica" size={15} /> Esporta in JSON
          </a>
        </div>

        <div className="card">
          <p className="titolo-sezione mb-2">Cancellazione dei dati</p>
          {utente.cancellazioneChiesta ? (
            <p className="text-sm text-warn">
              Richiesta inviata il {fmtDate(utente.cancellazioneChiesta)}. L’amministrazione
              procederà nei termini di legge, salvo i dati che vanno conservati per obbligo fiscale.
            </p>
          ) : (
            <FormAzione azione={chiediCancellazione}>
              <p className="text-sm text-muted">
                Scrivi <span className="text-ink">CANCELLA</span> per inviare la richiesta. I dati
                contabili obbligatori restano conservati per il periodo previsto dalla legge.
              </p>
              <input name="conferma" className="input" placeholder="CANCELLA" />
              <Invia className="btn-danger btn-sm">Chiedi la cancellazione</Invia>
            </FormAzione>
          )}
        </div>
      </div>
    </>
  );
}
