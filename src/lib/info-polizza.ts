import { prisma } from './db';

/**
 * Massimali e franchigie della polizza prova FIGT: cosa copre, e quanto.
 *
 * Chi è assicurato lo deve poter leggere dentro la sua polizza, il giorno in
 * cui serve; l'admin lo aggiorna quando la federazione cambia le condizioni
 * (Comando → Info polizza). Finché nessuno lo scrive vale questo.
 */
export const TESTO_INFO_POLIZZA = `## Massimali della polizza prova

- **Assicurati:** le persone che provano i «Giochi Tattici».
- **Durata della copertura:** il giorno dello svolgimento della prova.

### Garanzie e somme assicurate

| Garanzia | Somma assicurata |
| --- | --- |
| Invalidità permanente da infortunio | € 90.000,00 |
| Morte da infortunio | € 90.000,00 |
| Rimborso spese mediche da infortunio | € 3.000,00 |
| Diaria da ricovero | € 60,00 al giorno, massimo 30 giorni |
| Diaria da gesso | € 60,00 al giorno, massimo 60 giorni |

### Franchigie

- **Invalidità permanente da infortunio:** 5% assoluta.
- **Rimborso spese mediche:** scoperto del 10%, con il minimo di € 250,00.
`;

/** Il testo da mostrare: quello scritto dall'admin, o quello di serie. */
export async function infoPolizza(): Promise<string> {
  const imp = await prisma.impostazioni.findUnique({
    where: { id: 'app' },
    select: { infoPolizzaProva: true },
  });
  return imp?.infoPolizzaProva?.trim() || TESTO_INFO_POLIZZA;
}
