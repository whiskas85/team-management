import { prisma } from './db';
import { avvisaPersona } from './avvisi';
import { fmtDate, fmtEuro, nomeCompleto } from './format';

/** Il pulsante della notifica che conferma il pagamento senza aprire niente. */
export const AZIONE_CONFERMA = 'conferma-pagamento';

/**
 * «Ho pagato»: lo deve sapere chi incassa, subito.
 *
 * Senza questo avviso una segnalazione aspettava che qualcuno passasse per
 * caso dalla cassa. Arriva a chi gestisce quella cassa (segreteria e admin per
 * quella del club) e dice tutto quello che serve per decidere dal telefono:
 * **chi, quanto, come e quando**, e se c'è la ricevuta. Due pulsanti:
 * «Conferma» registra l'incasso da lì, con l'importo, la data e il metodo
 * dichiarati; «Controlla» apre la cassa, per guardare la ricevuta o annullare.
 *
 * Chi ha segnalato non riceve il proprio avviso, anche se gestisce la cassa.
 */
export async function avvisaPagamentoSegnalato(paymentId: string) {
  const p = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      userId: true,
      descrizione: true,
      importo: true,
      pagato: true,
      cassaId: true,
      dichiaratoIl: true,
      allegatoPath: true,
      allegatoTitolo: true,
      user: { select: { nome: true, cognome: true, callsign: true } },
      metodo: { select: { nome: true } },
      cassa: { select: { nome: true, gestori: { select: { id: true, stato: true } } } },
    },
  });
  if (!p || !p.dichiaratoIl) return;

  const destinatari = p.cassaId
    ? (p.cassa?.gestori ?? []).filter((g) => g.stato !== 'DISABILITATO').map((g) => g.id)
    : (
        await prisma.user.findMany({
          where: { roles: { hasSome: ['ADMIN', 'SEGRETERIA'] }, stato: { not: 'DISABILITATO' } },
          select: { id: true },
        })
      ).map((u) => u.id);

  const testo = testoPagamentoSegnalato({ ...p, dichiaratoIl: p.dichiaratoIl });
  const url = p.cassaId ? `/cassa?cassa=${p.cassaId}&filtro=dagestire` : '/admin/pagamenti';

  await Promise.all(
    destinatari
      .filter((id) => id !== p.userId)
      .map((id) =>
        avvisaPersona(id, {
          titolo: 'Pagamento da confermare',
          testo,
          url,
          tag: `incasso-${p.id}`,
          azioni: [
            { id: AZIONE_CONFERMA, testo: '✓ Conferma' },
            { id: 'apri', testo: 'Controlla' },
          ],
          rispondi: `/api/pagamenti/${p.id}/conferma`,
        }).catch(() => null),
      ),
  );
}

/** Chi, quanto, come e quando: il testo della notifica. */
export function testoPagamentoSegnalato(p: {
  descrizione: string;
  importo: unknown;
  pagato: unknown;
  dichiaratoIl: Date;
  allegatoPath: string | null;
  allegatoTitolo: string | null;
  user: { nome: string; cognome: string; callsign: string | null };
  metodo: { nome: string } | null;
  cassa: { nome: string } | null;
}) {
  const quanto = fmtEuro(Number(p.importo) - Number(p.pagato));
  const come = p.metodo?.nome ? ` con ${p.metodo.nome}` : '';
  const ricevuta = p.allegatoPath ? ` ${p.allegatoTitolo ?? 'Ricevuta'} allegata.` : '';
  return (
    `${nomeCompleto(p.user)} ha pagato ${quanto}${come} il ${fmtDate(p.dichiaratoIl)}` +
    ` per «${p.descrizione}».${ricevuta}` +
    (p.cassa ? ` Cassa: ${p.cassa.nome}.` : '')
  );
}
