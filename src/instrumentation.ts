/**
 * Quello che parte con il server. Per ora una cosa sola: il giro della coda
 * dei messaggi ai gestionali delle squadre collegate, che ritenta da solo
 * quello che non è arrivato (docs/COLLEGAMENTO-SQUADRE.md).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { avviaCodaFederazione } = await import('./lib/federazione-coda');
  avviaCodaFederazione();
}
