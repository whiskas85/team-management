import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { puoGestirePagamenti } from '@/lib/domain';
import { elencoOperatori } from '@/lib/query';
import { fmtEuro, nomeCompleto } from '@/lib/format';
import { Badge, Campo, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { abilitaGestore, eliminaCassa, salvaCassa, togliGestore } from '@/actions/casse';
import { eliminaMetodo, salvaMetodo } from '@/actions/metodi';

export const dynamic = 'force-dynamic';

type Metodo = {
  id: string;
  nome: string;
  descrizione: string | null;
  istruzioni: string | null;
  selfService: boolean;
  ordine: number;
  attivo: boolean;
};

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
            const dichiarabili = c.metodi.filter((m) => m.attivo && m.selfService).length;
            return (
              <div key={c.id} className={`card ${c.attiva ? '' : 'opacity-70'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-center gap-2 font-medium">
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
                  <div className="flex shrink-0 gap-2">
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
                    <AzioneBottone
                      azione={eliminaCassa}
                      valori={{ id: c.id }}
                      icona="elimina"
                      conferma={`Eliminare «${c.nome}»? Se ha dei pagamenti verrà solo spenta.`}
                      className="btn-danger btn-sm"
                    >
                      Elimina
                    </AzioneBottone>
                  </div>
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
                          className="flex items-center gap-2 rounded-md border border-line bg-surface2 px-2.5 py-1 text-sm"
                        >
                          {nomeCompleto(g)}
                          <AzioneBottone
                            azione={togliGestore}
                            valori={{ cassaId: c.id, userId: g.id }}
                            conferma={`Togliere a ${g.nome} la gestione di «${c.nome}»?`}
                            className="text-xs text-muted hover:text-danger"
                          >
                            togli
                          </AzioneBottone>
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
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="titolo-sezione">Come si paga</p>
                    <BottoneModale
                      etichetta="Aggiungi metodo"
                      icona="aggiungi"
                      titolo={`Nuovo metodo per «${c.nome}»`}
                      className="btn-ghost btn-sm"
                    >
                      <FormAzione azione={salvaMetodo}>
                        <input type="hidden" name="cassaId" value={c.id} />
                        <CampiMetodo />
                        <Invia icona="salva">Aggiungi</Invia>
                      </FormAzione>
                    </BottoneModale>
                  </div>

                  {c.metodi.length === 0 ? (
                    <p className="text-xs text-warn">
                      Nessun metodo: chi paga una quota di questa cassa non sa come farlo.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {c.metodi.map((m) => (
                        <div
                          key={m.id}
                          className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-surface2 px-3 py-2 ${
                            m.attivo ? '' : 'opacity-50'
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm">{m.nome}</span>
                            {m.istruzioni && (
                              <span className="block text-[11px] text-muted">{m.istruzioni}</span>
                            )}
                          </span>
                          {m.selfService && <Badge tono="ok">dichiarabile</Badge>}
                          {!m.attivo && <Badge tono="neutro">spento</Badge>}
                          <span className="flex gap-2">
                            <BottoneModale
                              etichetta="Modifica"
                              icona="modifica"
                              titolo={`Modifica «${m.nome}»`}
                              className="btn-ghost btn-sm"
                            >
                              <FormAzione azione={salvaMetodo}>
                                <input type="hidden" name="id" value={m.id} />
                                <CampiMetodo metodo={m} />
                                <Invia icona="salva">Salva</Invia>
                              </FormAzione>
                            </BottoneModale>
                            <AzioneBottone
                              azione={eliminaMetodo}
                              valori={{ id: m.id }}
                              icona="elimina"
                              conferma={`Eliminare «${m.nome}»? Se è già stato usato verrà solo spento.`}
                              className="btn-danger btn-sm"
                            >
                              Elimina
                            </AzioneBottone>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {c.metodi.length > 0 && dichiarabili === 0 && (
                    <p className="mt-2 text-xs text-warn">
                      Nessun metodo dichiarabile: chi paga non può segnalare il pagamento da solo.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Gli stessi campi dei metodi del club: una cassa si paga come le altre. */
function CampiMetodo({ metodo }: { metodo?: Metodo }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Nome *">
        <input
          name="nome"
          required
          defaultValue={metodo?.nome}
          className="input"
          placeholder="es. Bonifico a Mario"
        />
      </Campo>

      <Campo label="Ordine nella tendina">
        <input name="ordine" type="number" defaultValue={metodo?.ordine ?? 0} className="input" />
      </Campo>

      <Campo label="Descrizione" span>
        <input
          name="descrizione"
          defaultValue={metodo?.descrizione ?? ''}
          className="input"
          placeholder="Quando si usa"
        />
      </Campo>

      <Campo label="Istruzioni per chi paga" span>
        <textarea
          name="istruzioni"
          rows={2}
          defaultValue={metodo?.istruzioni ?? ''}
          className="input"
          placeholder="IBAN, numero Satispay, «contanti al corso»…"
        />
      </Campo>

      <label className="flex min-w-0 items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="selfService"
          defaultChecked={metodo?.selfService ?? true}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span className="min-w-0">
          Chi paga può dichiararlo da sé
          <span className="block text-[11px] text-muted">
            Il pagamento resta comunque da confermare da chi gestisce la cassa: serve solo a
            segnalare che il versamento è partito.
          </span>
        </span>
      </label>

      <label className="flex min-w-0 items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="attivo"
          defaultChecked={metodo ? metodo.attivo : true}
          className="h-4 w-4 accent-[color:var(--nvg)]"
        />
        Attivo
      </label>
    </div>
  );
}
