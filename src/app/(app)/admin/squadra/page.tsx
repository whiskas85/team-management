import Link from 'next/link';
import { Icona } from '@/components/Icona';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { leggiMiaSquadra, marchio, PARTENZA } from '@/lib/mia-squadra';
import { Badge, Campo, Intestazione } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { RitagliaFoto } from '@/components/RitagliaFoto';
import { ReferentiMiaSquadra } from '@/components/ReferentiMiaSquadra';
import { salvaLogoSquadra, salvaMiaSquadra, salvaReferenti } from '@/actions/mia-squadra';
import { SceltaTemaSquadra } from '@/components/SceltaTemaSquadra';
import { PortaleFigt } from '@/components/PortaleFigt';
import { AffiliazioniFigt } from '@/components/AffiliazioniFigt';
import { URL_ASNWG } from '@/lib/domain';
import { temaSquadra } from '@/lib/tema-server';
import { BottoneModale } from '@/components/Modale';
import { FormCampo } from '@/components/FormCampo';
import { salvaCampo } from '@/actions/campi';

export const dynamic = 'force-dynamic';

const TIPI_CAMPO: Record<string, string> = {
  BOSCHIVO: 'Boschivo',
  URBANO: 'Urbano',
  CQB: 'CQB',
  INDOOR: 'Indoor',
  MISTO: 'Misto',
};

/**
 * La nostra squadra: come si chiama, com'è fatta, chi la rappresenta.
 *
 * È il biglietto da visita che vedranno le squadre collegate
 * (docs/COLLEGAMENTO-SQUADRE.md), e nome e logo sono anche quelli del
 * gestionale. Qui non ci sono elenchi di persone: solo quello che si sceglie
 * di mostrare fuori.
 */
export default async function MiaSquadraPage() {
  await requirePermesso(isAdmin);
  const [s, m, tema, figt, collegate, richieste, whatsapp, referenti, persone, campi] = await Promise.all([
    leggiMiaSquadra(),
    marchio(),
    temaSquadra(),
    prisma.credenzialeFigt.findUnique({ where: { id: 'figt' } }),
    prisma.collegamentoSquadra.count({ where: { stato: 'ATTIVO' } }),
    prisma.collegamentoSquadra.count({ where: { stato: 'DA_ACCETTARE' } }),
    prisma.collegamentoWhatsapp.findUnique({ where: { id: 'whatsapp' } }),
    prisma.referenteMiaSquadra.findMany({ orderBy: { ordine: 'asc' } }),
    prisma.user.findMany({
      where: { stato: { in: ['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE'] } },
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, cognome: true, callsign: true },
    }),
    // i campi nostri, del team
    prisma.field.findMany({
      where: { nostro: true },
      orderBy: [{ attivo: 'desc' }, { nome: 'asc' }],
    }),
  ]);

  return (
    <>
      <Intestazione
        titolo="La mia squadra"
        sottotitolo="Il biglietto da visita della squadra, e il nome del gestionale"
        azioni={
          <>
          {/* la procedura del primo accesso, per ripassare tutto in fila */}
          <Link href="/configura" className="btn-ghost btn-sm">
            <Icona nome="naviga" size={15} /> Configurazione guidata
          </Link>
          <Link href="/admin/collegamenti" className="btn-primary btn-sm">
            <Icona nome="collegamento" size={15} /> Condividi il profilo
          </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="card">
          <p className="titolo-sezione mb-4">Profilo</p>
          <FormAzione azione={salvaMiaSquadra}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Nome della squadra">
                <input
                  name="nome"
                  defaultValue={m.nome}
                  placeholder={PARTENZA.nome}
                  className="input"
                />
              </Campo>
              <Campo label="Nome del gestionale">
                <input
                  name="nomeGestionale"
                  defaultValue={m.nomeGestionale}
                  placeholder={PARTENZA.nomeGestionale}
                  className="input"
                />
              </Campo>
              <Campo label="Motto">
                <input
                  name="motto"
                  defaultValue={m.motto}
                  placeholder={PARTENZA.motto}
                  className="input"
                />
              </Campo>
              <Campo label="Sito">
                <input
                  name="sito"
                  type="url"
                  defaultValue={s?.sito ?? ''}
                  placeholder="https://"
                  className="input"
                />
              </Campo>
              <Campo label="Città">
                <input name="citta" defaultValue={s?.citta ?? ''} className="input" />
              </Campo>
              <Campo label="Provincia">
                <input
                  name="provincia"
                  defaultValue={s?.provincia ?? ''}
                  maxLength={2}
                  className="input uppercase"
                />
              </Campo>
              <Campo label="Email della squadra">
                <input name="email" type="email" defaultValue={s?.email ?? ''} className="input" />
              </Campo>
              <Campo label="Telefono della squadra">
                <input name="telefono" defaultValue={s?.telefono ?? ''} className="input" />
              </Campo>
              <Campo label="Chi siamo" span>
                <textarea
                  name="descrizione"
                  defaultValue={s?.descrizione ?? ''}
                  rows={3}
                  className="input"
                />
              </Campo>
            </div>
            <p className="text-xs text-muted">
              Nome, gestionale e motto svuotati tornano a quelli di partenza (in grigio).
            </p>
            <Invia icona="salva">Salva il profilo</Invia>
          </FormAzione>
        </div>

        <div className="card">
          <p className="titolo-sezione mb-4">Logo</p>
          <RitagliaFoto
            fotoAttuale={m.logoUrl}
            // quello di partenza non si toglie: si sostituisce
            rimovibile={!!s?.logoPath}
            azione={salvaLogoSquadra}
            png
            cosa="logo"
          />
          <p className="mt-3 text-xs text-muted">
            È quello dell&apos;intestazione e dell&apos;invito alle altre squadre. Senza, resta
            quello di partenza.
          </p>
        </div>
      </div>

      {/* ------------------------------------------ collegamenti esterni */}
      {/* Tutto quello che collega la squadra a qualcosa di fuori, in un posto
          solo: il portale federale, i gestionali delle altre squadre,
          WhatsApp. Prima stavano in tre pagine diverse. */}
      <div id="collegamenti" className="card mt-6 scroll-mt-24">
        <p className="titolo-sezione">Collegamenti esterni</p>
        <p className="mb-4 mt-1 text-xs text-muted">
          Quello che collega la squadra a servizi e gestionali di fuori.
        </p>
        <ul className="divide-y divide-line">
          <li className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">Portale federale FIGT (ASNWG)</p>
              <p className="text-xs text-muted">
                {figt
                  ? `Collegato come ${figt.login} · associazione ${figt.idAnagrafica}${figt.idAffiliazione ? ` · affiliazione ${figt.idAffiliazione}` : ' · nessuna affiliazione attiva'}`
                  : 'Non collegato: bastano utenza e password del portale. Senza, niente tessere importate né polizze prova.'}
              </p>
            </div>
            <a href={URL_ASNWG} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
              <Icona nome="apri" size={15} /> Portale
            </a>
            <PortaleFigt collegamento={figt} />
            {figt && <AffiliazioniFigt />}
          </li>
          <li className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">Gestionali di altre squadre</p>
              <p className="text-xs text-muted">
                {collegate === 1 ? '1 squadra collegata' : `${collegate} squadre collegate`}
                {richieste > 0 && (
                  <span className="text-warn">
                    {' '}
                    · {richieste} {richieste === 1 ? 'richiesta' : 'richieste'} da accettare
                  </span>
                )}
              </p>
            </div>
            <Link href="/admin/collegamenti" className="btn-ghost btn-sm">
              <Icona nome="collegamento" size={15} /> Squadre collegate
            </Link>
          </li>
          <li className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">WhatsApp</p>
              <p className="text-xs text-muted">
                {whatsapp?.numero
                  ? `Collegato al numero ${whatsapp.numero}${whatsapp.gruppoNome ? ` · gruppo ${whatsapp.gruppoNome}` : ''}`
                  : 'Non collegato: i messaggi automatici non partono.'}
              </p>
            </div>
            <Link href="/admin/messaggi" className="btn-ghost btn-sm">
              <Icona nome="whatsapp" size={15} /> Messaggi WhatsApp
            </Link>
          </li>
        </ul>
      </div>

      {/* I campi dove giochiamo noi, gestiti dalla squadra: si correggono
          qui senza passare dall'anagrafica di tutti i campi, che ha anche
          quelli delle altre squadre */}
      <div id="campi" className="card mt-6 scroll-mt-24">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="titolo-sezione">I nostri campi</p>
            <p className="mt-1 text-xs text-muted">
              Dove gioca la squadra. La posizione è il punto «P · Parcheggio» sulla mappa delle
              attività.
            </p>
          </div>
          <BottoneModale
            etichetta="Aggiungi campo"
            icona="aggiungi"
            titolo="Nuovo campo"
            className="btn-ghost btn-sm"
            larga
          >
            <FormAzione azione={salvaCampo}>
              <FormCampo squadre={[]} nostro />
              <Invia icona="aggiungi">Aggiungi il campo</Invia>
            </FormAzione>
          </BottoneModale>
        </div>
        {campi.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nessun campo ancora: aggiungi quello dove giocate.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {campi.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <Icona nome="campi" size={16} />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium">
                    {c.nome}{' '}
                    {!c.attivo && <Badge tono="neutro">non attivo</Badge>}
                  </p>
                  <p className="text-xs text-muted">
                    {TIPI_CAMPO[c.tipo] ?? c.tipo}
                    {c.citta || c.indirizzo ? ` · ${c.citta ?? c.indirizzo}` : ''}
                    {c.lat === null || c.lng === null ? ' · posizione da segnare' : ''}
                  </p>
                </div>
                <BottoneModale
                  etichetta="Modifica"
                  icona="modifica"
                  titolo={`Modifica «${c.nome}»`}
                  className="btn-ghost btn-sm"
                  larga
                >
                  <FormAzione azione={salvaCampo}>
                    <FormCampo campo={c} squadre={[]} nostro />
                    <Invia icona="salva">Salva</Invia>
                  </FormAzione>
                </BottoneModale>
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/campi" className="mt-3 inline-block text-xs text-nvg hover:underline">
          Tutti i campi, anche quelli delle altre squadre →
        </Link>
      </div>

      <div className="card mt-6">
        <p className="titolo-sezione">Tema</p>
        <p className="mb-4 mt-1 text-xs text-muted">
          I colori del gestionale: il colore d’accento, uguale per tutti, e il fondo di partenza.
          Notte o giorno poi lo sceglie ognuno con la levetta nel chip col suo nome; dal profilo,
          chi ne ha bisogno, un tema per ipovedenti o daltonici.
        </p>
        <SceltaTemaSquadra iniziale={tema} logoUrl={m.logoUrl} />
      </div>

      <div className="card mt-6">
        <p className="titolo-sezione">Referenti</p>
        <p className="mb-4 mt-1 text-xs text-muted">
          Chi rappresenta la squadra verso fuori. Alle altre squadre si mostra col callsign e con i
          soli recapiti spuntati: il nome non esce mai.
        </p>
        <FormAzione azione={salvaReferenti}>
          <ReferentiMiaSquadra
            // dopo un salvataggio riparte da quello che è stato salvato davvero
            key={referenti
              .map((r) => `${r.userId}:${r.ruolo}:${r.mostraTelefono}:${r.mostraEmail}`)
              .join('|')}
            persone={persone.map((p) => ({
              id: p.id,
              etichetta: `${p.cognome} ${p.nome}${p.callsign ? ` · ${p.callsign}` : ''}`,
            }))}
            referenti={referenti.map((r) => ({
              userId: r.userId,
              ruolo: r.ruolo,
              mostraTelefono: r.mostraTelefono,
              mostraEmail: r.mostraEmail,
            }))}
          />
          <Invia icona="salva">Salva i referenti</Invia>
        </FormAzione>
      </div>
    </>
  );
}
