import Link from 'next/link';
import { comeChiamare, fmtDate, fmtEuro } from '@/lib/format';
import { isContatto } from '@/lib/domain';
import { prezzoDa, tuttoVenduto } from '@/lib/mercatino';
import { Badge } from '@/components/ui';

/* eslint-disable @next/next/no-img-element */

export type AnnuncioInBacheca = {
  id: string;
  titolo: string;
  stato: 'BOZZA' | 'PUBBLICATO' | 'RITIRATO';
  ufficiale: boolean;
  pubblicatoIl: Date | null;
  copertinaId: string | null;
  venditore: { nome: string; cognome: string; callsign: string | null; stato: string };
  voci: { prezzo: unknown; natura: string; stato: string; attiva: boolean }[];
};

/**
 * La card in bacheca.
 *
 * È la sola cosa che si vede prima di decidere se aprire, quindi porta le
 * quattro cose che servono a decidere: la foto scelta da chi vende, quanto
 * chiede, cosa vende e chi è. Il resto sta dentro.
 */
export function CardAnnuncio({
  annuncio,
  incarico,
}: {
  annuncio: AnnuncioInBacheca;
  /** Chi segue i contatti li vede col nome intero, come ovunque. */
  incarico: boolean;
}) {
  const prezzo = prezzoDa(annuncio.voci);
  const chiuso = annuncio.stato === 'RITIRATO' || tuttoVenduto(annuncio.voci);

  const chi = comeChiamare(annuncio.venditore, {
    incarico,
    diSquadra: !isContatto(annuncio.venditore.stato as never),
  });

  return (
    <Link
      href={`/mercatino/${annuncio.id}`}
      className={`group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-nvgdim ${
        chiuso ? 'opacity-60' : ''
      }`}
    >
      <div className="relative aspect-[4/3] bg-surface2">
        {annuncio.copertinaId ? (
          <img
            src={`/api/mercatino/foto/${annuncio.copertinaId}?m`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-muted">
            {annuncio.titolo}
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {annuncio.ufficiale && <Badge tono="info">merchandising</Badge>}
          {annuncio.stato === 'BOZZA' && <Badge tono="warn">bozza</Badge>}
          {annuncio.stato === 'RITIRATO' && <Badge tono="neutro">ritirato</Badge>}
          {annuncio.stato === 'PUBBLICATO' && tuttoVenduto(annuncio.voci) && (
            <Badge tono="neutro">venduto</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="num font-semibold text-nvg">
          {prezzo
            ? prezzo.unico
              ? fmtEuro(prezzo.min)
              : `da ${fmtEuro(prezzo.min)} a ${fmtEuro(prezzo.max)}`
            : 'prezzo da mettere'}
        </p>
        <p className="line-clamp-2 text-sm">{annuncio.titolo}</p>
        <p className="mt-auto pt-1 text-[11px] text-muted">
          {chi.nome}
          {annuncio.voci.length > 1 && ` · ${annuncio.voci.length} pezzi`}
          {annuncio.pubblicatoIl && ` · ${fmtDate(annuncio.pubblicatoIl)}`}
        </p>
      </div>
    </Link>
  );
}
