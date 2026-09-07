import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';
import { puoVedereNuovi } from '@/lib/domain';
import { filtroBacheca, puoFareUfficiale, puoVendere } from '@/lib/mercatino';
import { Campo, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { CardAnnuncio, type AnnuncioInBacheca } from '@/components/CardAnnuncio';
import { creaAnnuncio } from '@/actions/mercatino';

/**
 * La bacheca, usata da due pagine.
 *
 * L'usato e il merchandising stanno in due voci di menu separate perché si
 * guardano con la testa diversa: uno si sfoglia per curiosità quando si passa,
 * l'altro quando serve una maglia. Le regole di chi vede e chi pubblica però
 * sono le stesse, e stanno qui una volta sola.
 */
export async function Bacheca({
  me,
  ufficiale,
  titolo,
  sottotitolo,
  cerca,
  soloDisponibili,
  azione,
}: {
  me: SessionUser;
  /** Vera per il merchandising del team, falsa per l'usato fra soci. */
  ufficiale: boolean;
  titolo: string;
  sottotitolo: string;
  cerca: string;
  soloDisponibili: boolean;
  /** L'indirizzo a cui manda la barra di ricerca. */
  azione: string;
}) {
  const dove: Prisma.AnnuncioWhereInput = {
    AND: [
      filtroBacheca(me.id),
      { ufficiale },
      soloDisponibili ? { stato: 'PUBBLICATO' } : {},
      cerca
        ? {
            OR: [
              { titolo: { contains: cerca, mode: 'insensitive' } },
              { descrizione: { contains: cerca, mode: 'insensitive' } },
              { voci: { some: { titolo: { contains: cerca, mode: 'insensitive' } } } },
            ],
          }
        : {},
    ],
  };

  const [annunci, posso] = await Promise.all([
    prisma.annuncio.findMany({
      where: dove,
      orderBy: [{ pubblicatoIl: 'desc' }, { creatoIl: 'desc' }],
      include: {
        venditore: { select: { nome: true, cognome: true, callsign: true, stato: true } },
        voci: { select: { prezzo: true, natura: true, stato: true } },
      },
    }),
    // il catalogo del team lo apre solo l'admin: quel bollino decide che i
    // soldi finiscono in cassa, quindi non può metterselo chi vuole
    ufficiale ? puoFareUfficiale(me.roles) : puoVendere(me),
  ]);

  const bozze = annunci.filter((a) => a.stato === 'BOZZA').length;

  return (
    <>
      <Intestazione
        titolo={titolo}
        sottotitolo={sottotitolo}
        azioni={
          posso ? (
            <BottoneModale
              etichetta={ufficiale ? 'Nuovo articolo' : 'Metti in vendita'}
              icona="aggiungi"
              titolo={ufficiale ? 'Nuovo articolo del team' : 'Nuovo annuncio'}
              larga
            >
              <FormAzione azione={creaAnnuncio}>
                {ufficiale && <input type="hidden" name="ufficiale" value="on" />}
                <Campo label={ufficiale ? 'Cosa mette in vendita il team' : 'Cosa vendi'} span>
                  <input
                    name="titolo"
                    className="input"
                    maxLength={120}
                    placeholder={
                      ufficiale ? 'Maglietta di squadra' : 'Vendo tutto: torcia, tattico, mesh'
                    }
                  />
                </Campo>
                <Campo label="Descrizione" span>
                  <textarea
                    name="descrizione"
                    rows={3}
                    className="input"
                    placeholder={
                      ufficiale
                        ? 'Materiale, vestibilità, tempi di consegna…'
                        : 'Condizioni, difetti, dove ci si vede…'
                    }
                  />
                </Campo>
                <p className="text-xs text-muted">
                  Nasce in <strong className="text-ink">bozza</strong>: aggiungi le voci con i
                  prezzi e le foto, poi lo pubblichi tu quando è pronto.
                  {ufficiale && (
                    <>
                      {' '}
                      Quello che si ordina qui finisce nella{' '}
                      <strong className="text-ink">cassa della squadra</strong>.
                    </>
                  )}
                </p>
                <Invia icona="salva">Crea</Invia>
              </FormAzione>
            </BottoneModale>
          ) : undefined
        }
      />

      <form className="mb-4 flex flex-wrap items-end gap-2" action={azione}>
        <input
          name="q"
          defaultValue={cerca}
          className="input sm:w-72"
          placeholder="Cerca…"
        />
        <label className="flex items-center gap-2 pb-2 text-xs text-muted">
          <input
            type="checkbox"
            name="solo"
            value="disponibili"
            defaultChecked={soloDisponibili}
            className="h-4 w-4 accent-[color:var(--nvg)]"
          />
          Solo quelli ancora in vendita
        </label>
        <Invia className="btn-ghost btn-sm" icona="cerca">
          Filtra
        </Invia>
      </form>

      {bozze > 0 && (
        <p className="mb-3 text-xs text-warn">
          {bozze === 1 ? 'C’è 1 bozza' : `Ci sono ${bozze} bozze`}: le vedi solo tu finché non le
          pubblichi.
        </p>
      )}

      {annunci.length === 0 ? (
        <Vuoto
          testo={
            cerca
              ? `Nessun risultato per “${cerca}”.`
              : ufficiale
                ? posso
                  ? 'Nessun articolo del team. Creane uno: lo vedrà tutta la squadra.'
                  : 'Il team non ha ancora messo niente in catalogo.'
                : posso
                  ? 'Bacheca vuota. Comincia tu: metti in vendita quello che non usi più.'
                  : 'Bacheca vuota.'
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {(annunci as AnnuncioInBacheca[]).map((a) => (
            <CardAnnuncio key={a.id} annuncio={a} incarico={puoVedereNuovi(me.roles)} />
          ))}
        </div>
      )}
    </>
  );
}
