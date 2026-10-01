import { primoIban, primoLink } from '@/lib/link';
import { BottoneModale } from './Modale';
import { MetodiPagamento } from './MetodiPagamento';

/**
 * Su un'uscita di cassa che va a un operatore: come pagarlo. I suoi metodi,
 * scritti da lui nel profilo, con «Paga» per i link e «Copia IBAN».
 */
export function ComePagarlo({
  nome,
  importo,
  metodi,
}: {
  nome: string;
  importo: string;
  metodi: { id: string; nome: string; istruzioni: string | null }[];
}) {
  return (
    <BottoneModale
      etichetta="Come pagarlo"
      icona="pagamenti"
      titolo={`Pagare ${nome} · ${importo}`}
      className="btn-ghost btn-sm whitespace-nowrap"
    >
      {metodi.length === 0 ? (
        <p className="text-sm text-muted">
          {nome} non ha ancora indicato come essere pagato. Lo aggiunge dal suo profilo, in «Come
          essere pagato».
        </p>
      ) : (
        <MetodiPagamento
          metodi={metodi.map((m) => ({
            id: m.id,
            nome: m.nome,
            istruzioni: m.istruzioni,
            link: primoLink(m.istruzioni),
            iban: primoIban(m.istruzioni),
          }))}
        />
      )}
    </BottoneModale>
  );
}
