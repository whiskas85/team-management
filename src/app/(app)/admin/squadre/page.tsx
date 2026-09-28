import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { fmtDateTime } from '@/lib/format';
import { COMITATO_PREDEFINITO } from '@/lib/figt-squadre';
import { Campo, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioniContatto } from '@/components/AzioniContatto';
import { Invia } from '@/components/Bottone';
import { CampoFile } from '@/components/CampoFile';
import { eliminaSquadra, importaSquadreFigt, salvaSquadra } from '@/actions/squadre';
import { BottoneElimina } from '@/components/CardRiga';
import { CampiSquadra } from '@/components/CampiSquadra';
import { BadgeFigt, BadgeGiovanile, StellaSquadra } from '@/components/BadgeSquadra';
import type { Prisma } from '@prisma/client';

type SquadraElenco = Prisma.SquadraEsternaGetPayload<{
  include: {
    campi: { select: { id: true } };
    contatti: true;
  };
}>;

/**
 * Le squadre esterne. Dal portale FIGT arrivano tutte quelle della regione:
 * le **preferite** — quelle con cui si gioca davvero — stanno in cima, il
 * resto sotto, e le disattivate in fondo, fuori dai piedi.
 */
export default async function SquadrePage() {
  await requirePermesso(isAdmin);

  const [squadre, portale] = await Promise.all([
    prisma.squadraEsterna.findMany({
      orderBy: [{ stato: 'asc' }, { nome: 'asc' }],
      include: {
        campi: { select: { id: true } },
        contatti: { orderBy: { ordine: 'asc' } },
      },
    }),
    prisma.credenzialeFigt.findUnique({ where: { id: 'figt' }, select: { login: true } }),
  ]);

  const preferite = squadre.filter((s) => s.stato === 'PREFERITA');
  const altre = squadre.filter((s) => s.stato === 'ATTIVA');
  const spente = squadre.filter((s) => s.stato === 'DISATTIVATA');
  const ultimoImport = squadre.reduce<Date | null>(
    (u, s) => (s.figtAggiornataIl && (!u || s.figtAggiornataIl > u) ? s.figtAggiornataIl : u),
    null,
  );

  return (
    <>
      <Intestazione
        titolo="Squadre esterne"
        sottotitolo={
          ultimoImport
            ? `Gli altri team · ultimo aggiornamento dal portale FIGT ${fmtDateTime(ultimoImport)}`
            : 'Gli altri team: chi gestisce i campi e con chi si gioca'
        }
        azioni={
          <>
            <BottoneModale
              etichetta="Importa da FIGT"
              icona="scarica"
              titolo="Importa le squadre dal portale FIGT"
              className="btn-ghost"
              larga
            >
              <FormAzione azione={importaSquadreFigt}>
                <p className="mb-4 text-sm text-muted">
                  Legge le società affiliate dalla pagina «Statistiche» del comitato regionale:
                  indirizzo, disciplina, settore giovanile e presidente, vicepresidente e
                  segretario con i loro numeri. Le nuove entrano come attive, non preferite; quelle
                  che ci sono già si aggiornano. Rifarlo non crea doppioni.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo label="Comitato regionale (id sul portale)">
                    <input
                      name="comitato"
                      defaultValue={COMITATO_PREDEFINITO}
                      className="input"
                      inputMode="numeric"
                    />
                  </Campo>
                  <Campo label="Anno">
                    <input
                      name="anno"
                      type="number"
                      defaultValue={new Date().getFullYear()}
                      className="input"
                    />
                  </Campo>
                  <div className="sm:col-span-2">
                    <CampoFile
                      label={
                        portale
                          ? 'Oppure dalla pagina salvata (facoltativo)'
                          : 'Pagina salvata dal portale (HTML o HAR)'
                      }
                      accept=".html,.htm,.har,text/html,application/json"
                      estensioni={['.html', '.htm', '.har']}
                      maxBytes={20 * 1024 * 1024}
                      required={!portale}
                      aiuto={
                        portale
                          ? `Si entra con l’accesso salvato (${portale.login}). Carica un file solo se il portale non risponde.`
                          : 'L’accesso al portale non è salvato: apri Statistiche sul portale, salva la pagina (Ctrl+S) e caricala qui.'
                      }
                    />
                  </div>
                </div>
                <Invia icona="scarica">Importa</Invia>
              </FormAzione>
            </BottoneModale>
            <BottoneModale
              etichetta="Aggiungi squadra"
              icona="aggiungi"
              titolo="Nuova squadra"
              larga
            >
              <FormAzione azione={salvaSquadra}>
                <CampiSquadra />
                <Invia icona="salva">Aggiungi</Invia>
              </FormAzione>
            </BottoneModale>
          </>
        }
      />

      {squadre.length === 0 ? (
        <Vuoto testo="Nessuna squadra esterna registrata. Importale dal portale FIGT o aggiungile a mano." />
      ) : (
        <div className="space-y-8">
          <Gruppo
            titolo="Preferite"
            squadre={preferite}
            vuoto="Nessuna preferita: tocca la stella accanto a una squadra per portarla qui in cima."
          />
          <Gruppo titolo={preferite.length > 0 ? 'Le altre' : 'Squadre'} squadre={altre} />
          {spente.length > 0 && (
            <details className="group">
              <summary className="titolo-sezione mb-3 cursor-pointer list-none">
                Disattivate · {spente.length}{' '}
                <span className="text-muted group-open:hidden">(mostra)</span>
              </summary>
              <Righe squadre={spente} />
            </details>
          )}
        </div>
      )}
    </>
  );
}

function Gruppo({
  titolo,
  squadre,
  vuoto,
}: {
  titolo: string;
  squadre: SquadraElenco[];
  vuoto?: string;
}) {
  if (squadre.length === 0 && !vuoto) return null;
  return (
    <section>
      <h2 className="titolo-sezione mb-3">
        {titolo} · {squadre.length}
      </h2>
      {squadre.length === 0 ? <Vuoto testo={vuoto!} /> : <Righe squadre={squadre} />}
    </section>
  );
}

function Righe({ squadre }: { squadre: SquadraElenco[] }) {
  return (
    <div className="card divide-y divide-line p-0">
      {squadre.map((s) => {
        const presidente = s.contatti.find((c) => c.ruolo === 'Presidente') ?? s.contatti[0];
        return (
          <div
            key={s.id}
            className={`flex items-start gap-2 px-3 py-3 sm:items-center ${
              s.stato === 'DISATTIVATA' ? 'opacity-60' : ''
            }`}
          >
            <div className="w-8 shrink-0">
              <StellaSquadra id={s.id} stato={s.stato} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link
                  href={`/admin/squadre/${s.id}`}
                  className="break-words font-medium hover:text-nvg"
                >
                  {s.nome}
                </Link>
                {s.figtAggiornataIl && <BadgeFigt il={s.figtAggiornataIl} />}
                {s.settoreGiovanile && <BadgeGiovanile />}
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {[s.citta, s.provincia].filter(Boolean).join(' · ') || 'Località non indicata'}
                {presidente && (
                  <>
                    {' '}
                    · {presidente.ruolo} {presidente.nome}
                  </>
                )}
                {s.campi.length > 0 && (
                  <> · {s.campi.length === 1 ? '1 campo' : `${s.campi.length} campi`}</>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <div className="hidden sm:block">
                <AzioniContatto
                  telefono={presidente?.telefono ?? s.telefono}
                  email={presidente?.email ?? s.email}
                  compatto
                />
              </div>
              <BottoneElimina
                azione={eliminaSquadra}
                valori={{ id: s.id }}
                conferma={`Eliminare "${s.nome}"? Se è collegata a dei campi verrà solo disattivata.`}
                etichetta={`Elimina ${s.nome}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
