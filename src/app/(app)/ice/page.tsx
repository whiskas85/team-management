import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { etichettaStato, isAdmin, tonoStato } from '@/lib/domain';
import { puoVedereDatiMedici } from '@/lib/medico';
import { fmtDate, iniziali, nomeCompleto } from '@/lib/format';
import { Avatar, Badge, Elenco, Intestazione, Statistica, Vuoto } from '@/components/ui';
import { AzioniContatto } from '@/components/AzioniContatto';
import { Icona } from '@/components/Icona';

/**
 * ICE — In Case of Emergency. Sotto gli occhi, in un posto solo, quello che
 * serve se qualcuno si fa male in campo: gruppo sanguigno, allergie e note
 * mediche, e chi chiamare.
 */
export default async function IcePage() {
  // L’elenco di tutti è dell’admin: è l’anagrafica sanitaria della squadra in
  // una pagina sola. Quello che serve in campo — i dati di chi c’è quel giorno
  // — sta dentro l’attività, dove lo vedono anche i team leader.
  await requirePermesso(isAdmin);

  const operatori = await prisma.user.findMany({
    where: { stato: { in: ['SQUADRA', 'SOSPESO'] } },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    select: {
      id: true,
      nome: true,
      cognome: true,
      callsign: true,
      telefono: true,
      email: true,
      stato: true,
      dataNascita: true,
      gruppoSanguigno: true,
      allergie: true,
      emergenzaNome: true,
      emergenzaTel: true,
      fotoPath: true,
    },
  });

  const conNote = operatori.filter((o) => o.allergie?.trim());
  const senzaGruppo = operatori.filter((o) => !o.gruppoSanguigno);
  const senzaContatto = operatori.filter((o) => !o.emergenzaTel);

  // chi ha una nota medica va letto per primo
  const ordinati = [...operatori].sort((a, b) => {
    const ka = a.allergie?.trim() ? 0 : 1;
    const kb = b.allergie?.trim() ? 0 : 1;
    return ka - kb || a.cognome.localeCompare(b.cognome);
  });

  return (
    <>
      <Intestazione
        titolo="ICE — In caso di emergenza"
        sottotitolo="Dati sanitari della squadra: gruppo sanguigno, note mediche e chi chiamare"
      />

      <div className="mb-6 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
        <p className="flex items-start gap-2">
          <Icona nome="forse" size={16} />
          <span>
            Sono dati sanitari: consultali solo per la sicurezza in campo, non condividerli fuori
            dalla squadra e non copiarli altrove.
          </span>
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Statistica etichetta="Operatori" valore={operatori.length} />
        <Statistica
          etichetta="Con note mediche"
          valore={conNote.length}
          dettaglio="allergie o patologie"
          tono={conNote.length ? 'warn' : 'ok'}
        />
        <Statistica
          etichetta="Senza gruppo sanguigno"
          valore={senzaGruppo.length}
          tono={senzaGruppo.length ? 'warn' : 'ok'}
        />
        <Statistica
          etichetta="Senza contatto di emergenza"
          valore={senzaContatto.length}
          tono={senzaContatto.length ? 'danger' : 'ok'}
        />
      </div>

      {operatori.length === 0 ? (
        <Vuoto testo="Nessun operatore in squadra." />
      ) : (
        <Elenco
          cards={ordinati.map((o) => (
            <div
              key={o.id}
              className={`card ${o.allergie?.trim() ? 'border-warn/40' : ''}`}
            >
              <div className="flex items-start gap-3">
                <Avatar
                  iniziali={iniziali(o.nome, o.cognome)}
                  fotoDi={o.fotoPath ? o.id : null}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{nomeCompleto(o)}</h3>
                  <p className="num text-xs text-muted">
                    {o.dataNascita ? `nato il ${fmtDate(o.dataNascita)}` : 'data di nascita non indicata'}
                  </p>
                </div>
                <Badge tono={o.gruppoSanguigno ? 'ok' : 'warn'}>
                  {o.gruppoSanguigno ?? 'gruppo ignoto'}
                </Badge>
              </div>

              {o.allergie?.trim() ? (
                <p className="mt-3 whitespace-pre-wrap rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                  {o.allergie}
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted">Nessuna nota medica segnalata.</p>
              )}

              <div className="mt-3 border-t border-line pt-3">
                <p className="titolo-sezione mb-1">Chi chiamare</p>
                {o.emergenzaTel ? (
                  <>
                    <p className="text-sm">
                      {o.emergenzaNome ?? 'Contatto'}{' '}
                      <span className="num text-muted">· {o.emergenzaTel}</span>
                    </p>
                    <div className="mt-2">
                      <AzioniContatto
                        telefono={o.emergenzaTel}
                        email={null}
                        nome={o.emergenzaNome ?? undefined}
                        compatto
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-danger">Nessun contatto di emergenza registrato.</p>
                )}
              </div>
            </div>
          ))}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Operatore</th>
                  <th>Nato il</th>
                  <th>Gruppo</th>
                  <th>Allergie e note mediche</th>
                  <th>Contatto di emergenza</th>
                  <th>Suo telefono</th>
                </tr>
              </thead>
              <tbody>
                {ordinati.map((o) => (
                  <tr key={o.id} className={o.allergie?.trim() ? 'bg-warn/5' : ''}>
                    <td>
                      <span className="flex items-center gap-2">
                        <Avatar
                          iniziali={iniziali(o.nome, o.cognome)}
                          size="sm"
                          fotoDi={o.fotoPath ? o.id : null}
                        />
                        <span>
                          <span className="block font-medium">
                            {o.cognome} {o.nome}
                          </span>
                          {o.callsign && (
                            <span className="block text-[11px] text-nvg">{o.callsign}</span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-muted num">{fmtDate(o.dataNascita)}</td>
                    <td>
                      <Badge tono={o.gruppoSanguigno ? 'ok' : 'warn'}>
                        {o.gruppoSanguigno ?? '—'}
                      </Badge>
                    </td>
                    <td className="max-w-[280px]">
                      {o.allergie?.trim() ? (
                        <span className="whitespace-pre-wrap text-xs text-warn">{o.allergie}</span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {o.emergenzaTel ? (
                        <>
                          <span className="block text-xs">{o.emergenzaNome ?? 'Contatto'}</span>
                          <span className="num block text-[11px] text-muted">{o.emergenzaTel}</span>
                          <span className="mt-1 block">
                            <AzioniContatto
                              telefono={o.emergenzaTel}
                              email={null}
                              nome={o.emergenzaNome ?? undefined}
                              compatto
                            />
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-danger">mancante</span>
                      )}
                    </td>
                    <td>
                      <AzioniContatto
                        telefono={o.telefono}
                        email={o.email}
                        nome={o.nome}
                        compatto
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />
      )}
    </>
  );
}
