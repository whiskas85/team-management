import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { eventiPerLista } from '@/lib/query';
import {
  GIORNI_PREAVVISO_SCADENZA,
  isAdmin,
  puoAmministrare,
  puoGestirePagamenti,
  puoVedereNuovi,
  statoEffettivo,
  tonoCertificato,
  vedeAreaTesseramento,
} from '@/lib/domain';
import { fmtDate, fmtEuro, giorniA, stagioneCorrente, umanizza } from '@/lib/format';
import { Badge, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { CardEvento } from '@/components/CardEvento';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ benvenuto?: string; errore?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;
  const tesserato = vedeAreaTesseramento(me.stato);

  const [prossimi, certificati, pagamenti, iscrizione, tessera] = await Promise.all([
    eventiPerLista({
      stato: me.stato,
      userId: me.id,
      dove: { inizio: { gte: new Date() }, status: { not: 'ANNULLATA' } },
      limite: 4,
    }),
    tesserato
      ? prisma.medicalCertificate.findMany({
          where: { userId: me.id },
          orderBy: { createdAt: 'desc' },
          take: 3,
        })
      : Promise.resolve([]),
    prisma.payment.findMany({
      where: { userId: me.id, status: { in: ['DA_PAGARE', 'PARZIALE'] } },
      orderBy: { scadenza: 'asc' },
    }),
    prisma.membership.findFirst({
      where: { userId: me.id },
      orderBy: { invitataIl: 'desc' },
      include: { stagione: { select: { nome: true } } },
    }),
    tesserato
      ? prisma.figtCard.findFirst({
          where: { userId: me.id },
          orderBy: { createdAt: 'desc' },
          include: { stagione: { select: { nome: true } } },
        })
      : Promise.resolve(null),
  ]);

  const certAttuale = certificati[0];
  const statoCert = certAttuale ? statoEffettivo(certAttuale) : null;
  const daPagare = pagamenti.reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0);

  // riquadri di back office, in base agli incarichi
  const amministra = puoAmministrare(me.roles);
  const cassa = puoGestirePagamenti(me.roles);
  const admin = isAdmin(me.roles);
  // i contatti li seguono anche amministrazione e segreteria
  const contatti = puoVedereNuovi(me.roles);

  const limite = new Date(Date.now() + GIORNI_PREAVVISO_SCADENZA * 86400000);
  const [
    certDaVagliare,
    certInScadenza,
    richieste,
    invitiAperti,
    nuovi,
    apertiTutti,
    squadra,
    daConfermare,
    rimborsiAperti,
  ] = await Promise.all([
      amministra ? prisma.medicalCertificate.count({ where: { status: 'IN_ATTESA' } }) : 0,
      amministra
        ? prisma.medicalCertificate.count({
            where: { status: 'VALIDO', scadeIl: { gte: new Date(), lte: limite } },
          })
        : 0,
      amministra ? prisma.membership.count({ where: { status: 'COMPILATA' } }) : 0,
      amministra ? prisma.membership.count({ where: { status: 'INVITATA' } }) : 0,
      contatti ? prisma.user.count({ where: { stato: 'NUOVO' } }) : 0,
      cassa
        ? prisma.payment.findMany({
            where: { status: { in: ['DA_PAGARE', 'PARZIALE'] } },
            select: { importo: true, pagato: true },
          })
        : [],
      admin ? prisma.user.count({ where: { stato: 'SQUADRA' } }) : 0,
      cassa
        ? prisma.payment.count({
            where: { status: { not: 'PAGATO' }, dichiaratoIl: { not: null } },
          })
        : 0,
      cassa
        ? prisma.payment.findMany({
            where: { tipo: 'RIMBORSO', status: { notIn: ['PAGATO', 'ANNULLATO'] } },
            select: { importo: true, pagato: true },
          })
        : [],
    ]);

  const incassiAperti = apertiTutti.reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0);
  const daRimborsare = rimborsiAperti.reduce(
    (t, p) => t + Number(p.importo) - Number(p.pagato),
    0,
  );

  return (
    <>
      {/* il callsign e' come si chiamano fra loro: se ce l'ha, vince sul nome */}
      <Intestazione
        titolo={`Ciao ${me.callsign || me.nome}`}
        sottotitolo={
          tesserato
            ? `Situazione operativa · stagione ${stagioneCorrente()}`
            : 'Sei un contatto del team: qui trovi gli eventi aperti a cui puoi partecipare.'
        }
      />

      {sp.errore === 'permessi' && (
        <div className="mb-5 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Non hai i permessi per accedere a quella sezione.
        </div>
      )}

      {/* ------------------------------------------------ avvisi personali */}
      <div className="mb-6 space-y-3">
        {iscrizione?.status === 'INVITATA' && (
          <Avviso
            tono="info"
            testo="Hai ricevuto una richiesta di iscrizione: compila il modulo per inviarla in valutazione."
            href="/profilo"
            azione="Compila ora"
          />
        )}
        {iscrizione?.status === 'COMPILATA' && (
          <Avviso
            tono="warn"
            testo={`Modulo inviato il ${fmtDate(iscrizione.compilataIl)}: la richiesta è in valutazione.`}
            href="/profilo"
            azione="Dettagli"
          />
        )}

        {tesserato && !certAttuale && (
          <Avviso
            tono="warn"
            testo="Non hai ancora caricato un certificato medico."
            href="/certificati"
            azione="Carica ora"
          />
        )}
        {statoCert === 'SCADUTO' && (
          <Avviso
            tono="danger"
            testo="Il tuo certificato medico è scaduto: non puoi scendere in campo."
            href="/certificati"
            azione="Carica il rinnovo"
          />
        )}
        {statoCert === 'IN_ATTESA' && (
          <Avviso
            tono="warn"
            testo="Il tuo certificato è in attesa di approvazione dall’amministrazione."
            href="/certificati"
            azione="Vedi"
          />
        )}
        {statoCert === 'VALIDO' &&
          certAttuale?.scadeIl &&
          (giorniA(certAttuale.scadeIl) ?? 999) <= GIORNI_PREAVVISO_SCADENZA && (
            <Avviso
              tono="warn"
              testo={`Il certificato scade fra ${giorniA(certAttuale.scadeIl)} giorni (${fmtDate(certAttuale.scadeIl)}).`}
              href="/certificati"
              azione="Rinnova"
            />
          )}
        {daPagare > 0 && (
          <Avviso
            tono="warn"
            testo={`Hai ${fmtEuro(daPagare)} da saldare su ${pagamenti.length} voci.`}
            href="/pagamenti"
            azione="Vedi"
          />
        )}
      </div>

      {/* ------------------------------------------------ riepilogo personale */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tesserato && (
          <>
            <Statistica
              etichetta="Certificato"
              valore={statoCert ? umanizza(statoCert) : 'Assente'}
              dettaglio={
                certAttuale?.scadeIl ? `scade il ${fmtDate(certAttuale.scadeIl)}` : undefined
              }
              tono={statoCert ? tonoCertificato[statoCert] : 'danger'}
            />
            <Statistica
              etichetta="Iscrizione"
              valore={iscrizione ? umanizza(iscrizione.status) : 'Nessuna'}
              dettaglio={iscrizione?.stagione.nome}
              tono={iscrizione?.status === 'ATTIVA' ? 'ok' : 'warn'}
            />
            <Statistica
              etichetta="Tessera FIGT"
              valore={tessera?.codice ?? (tessera ? 'Da recuperare' : 'Nessuna')}
              dettaglio={tessera?.stagione.nome}
              tono={tessera?.status === 'ATTIVA' ? 'ok' : 'warn'}
            />
          </>
        )}
        {!tesserato && (
          <Statistica
            etichetta="Eventi aperti"
            valore={prossimi.length}
            dettaglio="a cui puoi partecipare"
            tono="info"
          />
        )}
        <Statistica
          etichetta="Da saldare"
          valore={fmtEuro(daPagare)}
          dettaglio={`${pagamenti.length} voci aperte`}
          tono={daPagare > 0 ? 'warn' : 'ok'}
        />
      </div>

      {/* ------------------------------------------------ back office */}
      {(amministra || cassa || admin) && (
        <section className="mb-8">
          <h2 className="titolo-sezione mb-3">Da gestire</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {amministra && (
              <>
                <Link href="/admin/richieste">
                  <Statistica
                    etichetta="Richieste da valutare"
                    valore={richieste}
                    tono={richieste ? 'warn' : 'ok'}
                  />
                </Link>
                <Link href="/admin/inviti">
                  <Statistica etichetta="Inviti non compilati" valore={invitiAperti} tono="info" />
                </Link>
                <Link href="/admin/certificati">
                  <Statistica
                    etichetta="Certificati da vagliare"
                    valore={certDaVagliare}
                    tono={certDaVagliare ? 'warn' : 'ok'}
                  />
                </Link>
                <Link href="/admin/certificati?filtro=scadenza">
                  <Statistica
                    etichetta="Certificati in scadenza"
                    valore={certInScadenza}
                    dettaglio={`entro ${GIORNI_PREAVVISO_SCADENZA} giorni`}
                    tono={certInScadenza ? 'warn' : 'ok'}
                  />
                </Link>
              </>
            )}
            {cassa && (
              <>
                <Link href="/admin/pagamenti?filtro=dagestire">
                  <Statistica
                    etichetta="Pagamenti da confermare"
                    valore={daConfermare}
                    dettaglio="segnalati dagli operatori"
                    tono={daConfermare ? 'warn' : 'ok'}
                  />
                </Link>
                <Link href="/admin/pagamenti?filtro=rimborsi">
                  <Statistica
                    etichetta="Rimborsi da erogare"
                    valore={rimborsiAperti.length}
                    dettaglio={fmtEuro(daRimborsare)}
                    tono={rimborsiAperti.length ? 'warn' : 'ok'}
                  />
                </Link>
                <Link href="/admin/pagamenti">
                  <Statistica
                    etichetta="Incassi aperti"
                    valore={fmtEuro(incassiAperti)}
                    tono={incassiAperti > 0 ? 'warn' : 'ok'}
                  />
                </Link>
              </>
            )}
            {contatti && (
              <Link href="/admin/nuovi">
                <Statistica etichetta="Nuovi contatti" valore={nuovi} tono="info" />
              </Link>
            )}
            {admin && (
              <Link href="/admin/operatori">
                <Statistica etichetta="Operatori in squadra" valore={squadra} />
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ prossimi eventi */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="titolo-sezione">Prossimi eventi</h2>
          <Link href="/calendario" className="text-xs text-nvg hover:underline">
            Calendario completo →
          </Link>
        </div>

        {prossimi.length === 0 ? (
          <Vuoto testo="Nessun evento in programma." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {prossimi.map((e) => (
              <CardEvento key={e.id} e={e} />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ ultimi certificati */}
      {tesserato && certificati.length > 0 && (
        <section className="mt-8">
          <h2 className="titolo-sezione mb-3">I tuoi certificati</h2>
          <div className="space-y-2">
            {certificati.map((c) => {
              const stato = statoEffettivo(c);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3"
                >
                  <div>
                    <p className="text-sm">{umanizza(c.tipo)}</p>
                    <p className="text-xs text-muted num">
                      Scadenza {fmtDate(c.scadeIl)} · caricato il {fmtDate(c.createdAt)}
                    </p>
                  </div>
                  <Badge tono={tonoCertificato[stato]}>{umanizza(stato)}</Badge>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function Avviso({
  tono,
  testo,
  href,
  azione,
}: {
  tono: 'warn' | 'danger' | 'info';
  testo: string;
  href: string;
  azione: string;
}) {
  const stili = {
    warn: 'border-warn/40 bg-warn/10 text-warn',
    danger: 'border-danger/40 bg-danger/10 text-danger',
    info: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  }[tono];

  return (
    <div
      className={`flex flex-col gap-2 rounded-md border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${stili}`}
    >
      <span>{testo}</span>
      <Link href={href} className="shrink-0 font-medium underline underline-offset-4">
        {azione} →
      </Link>
    </div>
  );
}
