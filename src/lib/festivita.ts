/**
 * Le festività nazionali italiane, importate: non le scriviamo noi.
 *
 * Vengono da Nager.Date (date.nager.at), un servizio pubblico e gratuito che
 * pubblica le festività ufficiali di ogni paese: se una cambia — com'è
 * successo con San Francesco, tornata festa dal 2026 — si aggiorna lì, e qui
 * arriva da sola. Il server le chiede una volta al giorno per anno (Next le
 * tiene in cache), e se il servizio non risponde il calendario resta senza
 * festività: niente elenchi di riserva scritti a mano da tenere allineati.
 */

type FestivitaNager = { date: string; localName: string; name: string };

/** Le festività di un anno, per giorno: chiave anno-mese(0..11)-giorno. */
async function festivitaDellAnno(anno: number): Promise<[string, string][]> {
  try {
    const risposta = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${anno}/IT`, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(3_000),
    });
    if (!risposta.ok) return [];
    const elenco = (await risposta.json()) as FestivitaNager[];
    return elenco.map((f) => {
      const [a, m, g] = f.date.split('-').map(Number);
      return [`${a}-${m - 1}-${g}`, f.localName || f.name];
    });
  } catch {
    return [];
  }
}

/**
 * Le festività attorno a oggi: l'anno scorso, quest'anno e i due prossimi —
 * quanto si sfoglia davvero nel calendario.
 */
export async function festivitaVicine(): Promise<Record<string, string>> {
  const anno = new Date().getFullYear();
  const anni = await Promise.all([anno - 1, anno, anno + 1, anno + 2].map(festivitaDellAnno));
  return Object.fromEntries(anni.flat());
}
