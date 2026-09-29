/* eslint-disable @next/next/no-img-element */

export type Organizzatore = { nome: string; logo: string | null };

/**
 * «Organizza: Lupi Grigi Softair», col loro logo. Sta su tutte le attività
 * che arrivano da un'altra squadra collegata: sulle card, nello storico e
 * dentro la scheda. Chi guarda deve capire al volo che non l'abbiamo decisa
 * noi, e a chi chiedere.
 */
export function BadgeOrganizzatore({
  organizzatore,
  grande = false,
}: {
  organizzatore: Organizzatore;
  grande?: boolean;
}) {
  const lato = grande ? 22 : 16;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border border-nvg/40 bg-nvg/10 text-nvg ${
        grande ? 'py-0.5 pl-0.5 pr-2.5 text-xs' : 'py-px pl-px pr-2 text-[11px]'
      }`}
      title={`Organizzata da ${organizzatore.nome}`}
    >
      {organizzatore.logo ? (
        <img
          src={organizzatore.logo}
          alt=""
          width={lato}
          height={lato}
          className="shrink-0 rounded-full object-cover"
          style={{ width: lato, height: lato }}
        />
      ) : (
        <span
          className="shrink-0 rounded-full bg-nvg/20"
          style={{ width: lato, height: lato }}
          aria-hidden
        />
      )}
      <span className="truncate">
        <span className="text-nvg/70">Organizza </span>
        {organizzatore.nome}
      </span>
    </span>
  );
}
