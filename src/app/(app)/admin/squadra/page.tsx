import Link from 'next/link';
import { Icona } from '@/components/Icona';
import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { leggiMiaSquadra, marchio, PARTENZA } from '@/lib/mia-squadra';
import { Campo, Intestazione } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { RitagliaFoto } from '@/components/RitagliaFoto';
import { ReferentiMiaSquadra } from '@/components/ReferentiMiaSquadra';
import { salvaLogoSquadra, salvaMiaSquadra, salvaReferenti } from '@/actions/mia-squadra';

export const dynamic = 'force-dynamic';

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
  const [s, m, referenti, persone] = await Promise.all([
    leggiMiaSquadra(),
    marchio(),
    prisma.referenteMiaSquadra.findMany({ orderBy: { ordine: 'asc' } }),
    prisma.user.findMany({
      where: { stato: { in: ['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE'] } },
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, cognome: true, callsign: true },
    }),
  ]);

  return (
    <>
      <Intestazione
        titolo="La mia squadra"
        sottotitolo="Il biglietto da visita della squadra, e il nome del gestionale"
        azioni={
          <Link href="/admin/collegamenti" className="btn-primary btn-sm">
            <Icona nome="collegamento" size={15} /> Condividi il profilo
          </Link>
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
                  defaultValue={s?.nome ?? ''}
                  placeholder={PARTENZA.nome}
                  className="input"
                />
              </Campo>
              <Campo label="Nome del gestionale">
                <input
                  name="nomeGestionale"
                  defaultValue={s?.nomeGestionale ?? ''}
                  placeholder={PARTENZA.nomeGestionale}
                  className="input"
                />
              </Campo>
              <Campo label="Motto">
                <input
                  name="motto"
                  defaultValue={s?.motto ?? ''}
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
              Un campo lasciato vuoto usa il valore di partenza, scritto in grigio.
            </p>
            <Invia icona="salva">Salva il profilo</Invia>
          </FormAzione>
        </div>

        <div className="card">
          <p className="titolo-sezione mb-4">Logo</p>
          <RitagliaFoto
            fotoAttuale={s?.logoPath ? m.logoUrl : null}
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

      <div className="card mt-6">
        <p className="titolo-sezione">Referenti</p>
        <p className="mb-4 mt-1 text-xs text-muted">
          Chi rappresenta la squadra verso fuori. Alle altre squadre si mostra col callsign e con i
          soli recapiti spuntati: il nome non esce mai.
        </p>
        <FormAzione azione={salvaReferenti}>
          <ReferentiMiaSquadra
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
