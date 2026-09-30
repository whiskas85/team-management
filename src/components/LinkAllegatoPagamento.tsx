import { Icona } from './Icona';

/** La ricevuta allegata a un pagamento segnalato, da aprire prima di confermare. */
export function LinkAllegatoPagamento({
  pagamento,
}: {
  pagamento: { id: string; allegatoPath?: string | null; allegatoTitolo?: string | null };
}) {
  if (!pagamento.allegatoPath) return null;
  return (
    <a
      href={`/api/pagamenti/${pagamento.id}/allegato`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-[11px] text-nvg hover:underline"
    >
      <Icona nome="allegato" size={12} />
      {pagamento.allegatoTitolo ?? 'Allegato'}
    </a>
  );
}
