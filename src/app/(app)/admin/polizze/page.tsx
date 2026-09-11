import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { puoAmministrare } from '@/lib/domain';
import { fmtDateTime } from '@/lib/format';
import {
  ETICHETTA_ASSICURAZIONE,
  TONO_ASSICURAZIONE,
  attivitaDaCoprire,
  etichettaGiorno,
} from '@/lib/assicurazione';
import { Avatar, Badge, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { BottoneModale } from '@/components/Modale';
import { FormGiornaliera } from '@/components/FormGiornaliera';
import { GiacenzaPolizze } from '@/components/GiacenzaPolizze';

export const dynamic = 'force-dynamic';

/**
 * Le polizze da fare, attività per attività.
 *
 * Chi amministra ha una domanda sola, il giovedì sera: **chi viene domenica
 * senza tessera, e posso coprirlo?** Per rispondere, prima, bisognava aprire
 * il calendario, entrare in ogni attività, scorrere l'elenco dei partecipanti
 * e ricostruire a mente chi fosse ospite, chi già coperto, chi in regola con
 * la quota. Qui è tutto in una schermata, e le attività senza ospiti non
 * compaiono nemmeno.
 *
 * Le card sono volutamente povere: niente formazione, niente adesioni, niente
 * quote in euro. Chi amministra non tiene la cassa — quella è della segreteria
 * — e di un pagamento gli serve sapere una cosa sola, se è entrato o no,
 * perché è quella a decidere se la polizza si può fare.
 */
export default async function PolizzePage() {
  await requirePermesso(puoAmministrare);

  const attivita = await attivitaDaCoprire();
  // un'attività di soli soci non ha niente da assicurare: tenerla in elenco
  // vorrebbe dire far scorrere dieci card vuote per trovarne una che serve
  const conOspiti = attivita.filter((a) => a.nuovi.length > 0);
  const daFare = conOspiti.reduce((t, a) => t + a.daFare, 0);
  // si contano i giorni, non le persone: uno che viene sabato e domenica ha
  // due polizze da fare, e contarlo una volta sola nasconderebbe la seconda
  const scoperti = conOspiti.reduce(
    (t, a) =>
      t +
      a.nuovi.reduce(
        (s, n) => s + n.giorni.filter((g) => g.serve && g.copertura !== 'ASSICURATO').length,
        0,
      ),
    0,
  );

  return (
    <>
      <Intestazione
        titolo="Polizze giornaliere"
        sottotitolo="Chi viene da fuori nelle attività in programma, e chi va coperto"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica etichetta="Attività con ospiti" valore={conOspiti.length} />
        <Statistica
          etichetta="Ancora scoperti"
          valore={scoperti}
          tono={scoperti > 0 ? 'warn' : 'ok'}
        />
        <Statistica
          etichetta="Pronti da assicurare"
          valore={daFare}
          dettaglio="quota saldata o dichiarata, dati a posto"
          tono={daFare > 0 ? 'warn' : 'neutro'}
        />
        <GiacenzaPolizze />
      </div>

      {conOspiti.length === 0 ? (
        <Vuoto testo="Nelle attività in programma non si è segnato nessuno da fuori: non c’è niente da assicurare." />
      ) : (
        <div className="space-y-4">
          {conOspiti.map((a) => (
            <div key={a.id} className="card">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line pb-3">
                <Link href={`/calendario/${a.id}`} className="font-medium hover:text-nvg">
                  {a.titolo}
                </Link>
                <span className="num text-xs text-muted">
                  {fmtDateTime(a.quando)}
                  {a.dove ? ` · ${a.dove}` : ''}
                </span>
              </div>

              <div className="space-y-2">
                {a.nuovi.map((n) => (
                  <div
                    key={n.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface2 px-3 py-2"
                  >
                    {/* la foto solo a chi ce l'ha: agli altri l'immagine
                        arrivava rotta al posto delle iniziali */}
                    <Avatar iniziali={n.iniziali} fotoDi={n.foto ? n.id : null} size="sm" />
                    <span className="min-w-0 flex-1">
                      <Link
                        href={`/admin/operatori/${n.id}`}
                        className="block truncate text-sm hover:text-nvg"
                      >
                        {n.nome}
                      </Link>
                      {/* "forse" non è un no: la polizza vale per il giorno, e
                          farla a chi poi non viene è una polizza buttata */}
                      {n.forse && (
                        <span className="block text-[11px] text-warn">ha risposto «forse»</span>
                      )}
                    </span>

                    {/* dei soldi qui si dice una cosa sola: se sono entrati.
                        Quanto siano è mestiere della segreteria */}
                    {!n.haQuota ? (
                      <Badge tono="neutro">niente da pagare</Badge>
                    ) : n.pagato ? (
                      <Badge tono="ok">quota saldata</Badge>
                    ) : n.dichiarata ? (
                      // l'ha detto lui e manca la spunta della segreteria:
                      // basta per coprirlo, non per dire che i soldi sono entrati
                      <Badge tono="info">pagamento dichiarato</Badge>
                    ) : (
                      <Badge tono="warn">quota da saldare</Badge>
                    )}

                    {/* Una riga per giorno: la giornaliera vale fino alle 24
                        del suo giorno, e un'attività di due giorni ne vuole
                        due. Il motivo per cui non si può si scrive una volta
                        sola, non uguale sotto ogni data. */}
                    {(() => {
                      const blocco = !n.copribile ? 'incasso' : !n.datiCompleti ? 'dati' : null;
                      const scoperto = n.giorni.some(
                        (g) => g.serve && g.copertura !== 'ASSICURATO',
                      );
                      return (
                        <div className="flex flex-col items-end gap-1.5">
                          {n.giorni.map((g) => (
                            <div
                              key={g.giorno}
                              className="flex flex-wrap items-center justify-end gap-2"
                            >
                              {a.giorni.length > 1 && (
                                <span className="num text-[11px] text-muted">
                                  {etichettaGiorno(g.giorno)}
                                </span>
                              )}
                              {g.serve ? (
                                <Badge tono={TONO_ASSICURAZIONE[g.copertura]}>
                                  {ETICHETTA_ASSICURAZIONE[g.copertura]}
                                  {g.codice ? ` · ${g.codice}` : ''}
                                </Badge>
                              ) : (
                                <Badge tono="ok">tessera annuale</Badge>
                              )}
                              {!blocco && g.serve && g.copertura !== 'ASSICURATO' && (
                                <BottoneModale
                                  etichetta="Assicura"
                                  icona="tessera"
                                  titolo={`Giornaliera per ${n.nome} · ${etichettaGiorno(g.giorno)}`}
                                  className="btn-ghost btn-sm"
                                >
                                  <FormGiornaliera
                                    userId={n.id}
                                    eventId={a.id}
                                    nome={n.nome}
                                    giorno={g.giorno}
                                  />
                                </BottoneModale>
                              )}
                            </div>
                          ))}
                          {scoperto &&
                            (blocco === 'incasso' ? (
                              // niente pulsante e il motivo scritto: un pulsante che
                              // rifiuta sempre insegna solo a premerlo di nuovo
                              <span className="text-[11px] text-muted">
                                si assicura dopo l’incasso
                              </span>
                            ) : blocco === 'dati' ? (
                              <Link
                                href={`/admin/operatori/${n.id}`}
                                className="text-[11px] text-muted hover:text-nvg"
                              >
                                mancano data e luogo di nascita →
                              </Link>
                            ) : null)}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Compaiono solo le attività <strong className="text-ink">rilasciate e non ancora
        passate</strong>, e solo chi non è in squadra: i soci hanno la loro annuale. La polizza si
        attiva a quota saldata — la spende il club e non torna indietro — e chi è già coperto da
        una tessera federale valida quel giorno non ne ha bisogno.
      </p>
    </>
  );
}
