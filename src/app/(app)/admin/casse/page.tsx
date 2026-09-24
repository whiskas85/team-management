import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoGestirePagamenti } from '@/lib/domain';
import { elencoOperatori } from '@/lib/query';
import { fmtEuro, nomeCompleto } from '@/lib/format';
import { Badge, Campo, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { abilitaGestore, eliminaCassa, salvaCassa, togliGestore } from '@/actions/casse';
import { MetodiCassa } from '@/components/MetodiCassa';
import { BottoneElimina } from '@/components/CardRiga';

export const dynamic = 'force-dynamic';

/**
 * Le casse che non sono del club, e come si configurano.
 *
 * Qui la segreteria decide che una cassa esiste, chi la gestisce e con quali
 * metodi la si paga. Non vede chi ha pagato: di una cassa che non è del club
 * le basta sapere se lavora — quante quote aspettano, quante sono da
 * confermare, quanto è entrato — e chi la gestisce vede il resto.
 */
export default async function AltreCassePage() {
  await requirePermesso(puoGestirePagamenti);

  const [casse, persone, pagamenti] = await Promise.all([
    prisma.cassa.findMany({
      orderBy: [{ attiva: 'desc' }, { nome: 'asc' }],
      include: {
        gestori: {
          select: { id: true, nome: true, cognome: true, callsign: true },
          orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
        },
        metodi: { orderBy: [{ attivo: 'desc' }, { ordine: 'asc' }, { nome: 'asc' }] },
      },
    }),
    elencoOperatori(false),
    // solo i numeri, non le righe
    prisma.payment.findMany({
      where: { cassaId: { not: null } },
      select: {
        cassaId: true,
        importo: true,
        pagato: true,
        status: true,
        tipo: true,
        dichiaratoIl: true,
      },
    }),
  ]);

  const numeri = (id: string) => {
    const suoi = pagamenti.filter((p) => p.cassaId === id && p.tipo !== 'RIMBORSO');
    const aperti = suoi.filter((p) => p.status === 'DA_PAGARE' || p.status === 'PARZIALE');
    return {
      aperti: aperti.length,
      daIncassare: aperti.reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0),
      daConfermare: suoi.filter((p) => p.status !== 'PAGATO' && p.dichiaratoIl).length,
      incassato: suoi.reduce((t, p) => t + Number(p.pagato), 0),
    };
  };

  return (
    <>
      <Intestazione
        titolo="Altre casse"
        sottotitolo="Le casse che non sono del club: chi le gestisce e come si paga"
        azioni={
          <BottoneModale etichetta="Nuova cassa" icona="aggiungi" titolo="Nuova cassa">
            <FormAzione azione={salvaCassa}>
              <Campo label="Nome *">
                <input
                  name="nome"
                  required
                  className="input"
                  placeholder="es. Corso K9 — Mario Rossi"
                />
              </Campo>
              <Invia icona="salva">Crea</Invia>
            </FormAzione>
          </BottoneModale>
        }
      />

      <p className="mb-5 rounded-md border border-line bg-surface2 px-4 py-3 text-xs text-muted">
        La cassa del club resta quella di sempre, in <strong className="text-ink">Cassa</strong> e{' '}
        <strong className="text-ink">Pagamenti</strong>. Qui ci sono le altre: i soldi che
        finiscono lì non passano dal club e non pesano sul suo saldo, e li conferma solo chi le
        gestisce. Da qui si vede quanto lavorano, non chi ha pagato.
      </p>

      {casse.length === 0 ? (
        <Vuoto testo="Nessuna cassa oltre a quella del club." />
      ) : (
        <div className="space-y-4">
          {casse.map((c) => {
            const n = numeri(c.id);
            const abilitabili = persone.filter((p) => !c.gestori.some((g) => g.id === p.id));
            return (
              <div key={c.id} className={`card ${c.attiva ? '' : 'opacity-70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="flex flex-wrap items-center gap-2 break-words font-medium">
                      {c.nome}
                      {!c.attiva && <Badge tono="neutro">spenta</Badge>}
                    </h2>
                    <p className="num mt-1 text-xs text-muted">
                      {n.aperti === 0
                        ? 'nessuna quota da incassare'
                        : `${n.aperti === 1 ? '1 quota' : `${n.aperti} quote`} da incassare · ${fmtEuro(n.daIncassare)}`}
                      {n.daConfermare > 0 && ` · ${n.daConfermare} da confermare`}
                      {` · incassati ${fmtEuro(n.incassato)}`}
                    </p>
                  </div>
                  <BottoneElimina
                    azione={eliminaCassa}
                    valori={{ id: c.id }}
                    conferma={`Eliminare «${c.nome}»? Se ha dei pagamenti verrà solo spenta.`}
                    etichetta={`Elimina ${c.nome}`}
                  />
                </div>

                {/* ------------------------------------------ chi la gestisce */}
                <div className="mt-4 border-t border-line pt-3">
                  <p className="titolo-sezione mb-2">Chi la gestisce</p>
                  {c.gestori.length === 0 ? (
                    <p className="mb-2 text-xs text-warn">
                      Nessuno: i pagamenti che finiscono qui non li può confermare nessuno.
                    </p>
                  ) : (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {c.gestori.map((g) => (
                        <span
                          key={g.id}
                          className="flex items-center gap-1 rounded-md border border-line bg-surface2 py-0.5 pl-2.5 pr-1 text-sm"
                        >
                          {nomeCompleto(g)}
                          <BottoneElimina
                            piccolo
                            azione={togliGestore}
                            valori={{ cassaId: c.id, userId: g.id }}
                            conferma={`Togliere a ${g.nome} la gestione di «${c.nome}»?`}
                            etichetta={`Togli ${nomeCompleto(g)} dai gestori`}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                  {abilitabili.length > 0 && (
                    <FormAzione azione={abilitaGestore} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="cassaId" value={c.id} />
                      <select name="userId" className="input max-w-xs" defaultValue="">
                        <option value="">— abilita una persona —</option>
                        {abilitabili.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.cognome} {p.nome}
                            {p.callsign ? ` · ${p.callsign}` : ''}
                          </option>
                        ))}
                      </select>
                      <Invia icona="aggiungi" className="btn-ghost btn-sm">
                        Abilita
                      </Invia>
                    </FormAzione>
                  )}
                </div>

                {/* ------------------------------------------ come si paga */}
                <div className="mt-4 border-t border-line pt-3">
                  <MetodiCassa cassa={c} metodi={c.metodi} />
                </div>

                {/* le azioni della cassa: sotto, a destra, come in tutte le card */}
                <div className="piede">
                  <BottoneModale
                    etichetta="Modifica"
                    icona="modifica"
                    titolo={`Modifica «${c.nome}»`}
                    className="btn-ghost btn-sm"
                  >
                    <FormAzione azione={salvaCassa}>
                      <input type="hidden" name="id" value={c.id} />
                      <Campo label="Nome *">
                        <input name="nome" required defaultValue={c.nome} className="input" />
                      </Campo>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="attiva"
                          defaultChecked={c.attiva}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
                        />
                        <span>
                          Attiva
                          <span className="block text-[11px] text-muted">
                            Spenta non riceve quote nuove; chi la gestisce continua a vedere
                            quelle che ci sono.
                          </span>
                        </span>
                      </label>
                      <Invia icona="salva">Salva</Invia>
                    </FormAzione>
                  </BottoneModale>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
