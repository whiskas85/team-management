import Link from 'next/link';
import { requirePermesso } from '@/lib/auth';
import { isAdmin, puoGestirePagamenti } from '@/lib/domain';
import { fmtEuro } from '@/lib/format';
import { Intestazione, Statistica } from '@/components/ui';
import { GiacenzaPolizze } from '@/components/GiacenzaPolizze';
import { ORIGINI, PulsantiMovimento, RegistroCassa, type Origine } from '@/components/RegistroCassa';
import { leggiRegistro, merciDelMagazzino, operatoriPerUscite } from '@/lib/registro-cassa';
import { CASSA_CLUB } from '@/lib/casse';

/**
 * La cassa del club: la cassa di partenza, che tengono admin e segreteria. È
 * una cassa come le altre (lib/registro-cassa) — registro unico, saldo,
 * entrate e uscite a mano — con in più quello che è solo del club: il
 * magazzino, le polizze prova prepagate.
 */
export default async function CassaPage({
  searchParams,
}: {
  searchParams: Promise<{ origine?: string }>;
}) {
  const me = await requirePermesso(puoGestirePagamenti);
  const sp = await searchParams;
  const origine = (Object.keys(ORIGINI).includes(sp.origine ?? '') ? sp.origine : 'tutte') as Origine;

  const [{ conti, daMano, daAttivita, metodi }, merci, operatori] = await Promise.all([
    leggiRegistro(null),
    merciDelMagazzino(),
    operatoriPerUscite(),
  ]);
  const voci = [
    ...(origine === 'attivita' ? [] : daMano),
    ...(origine === 'mano' ? [] : daAttivita),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  return (
    <>
      <Intestazione
        titolo={CASSA_CLUB}
        sottotitolo="Registro unico: le quote incassate dalle attività e i movimenti scritti a mano"
        azioni={
          <div className="flex flex-wrap items-center gap-2">
            <PulsantiMovimento cassaId={null} metodi={metodi} merci={merci} operatori={operatori} />
          </div>
        }
      />

      {/* ------------------------------------------------ saldo */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Statistica
          etichetta="Saldo di cassa"
          valore={fmtEuro(conti.saldo)}
          dettaglio={
            conti.creditoResiduo > 0.001
              ? `di cui ${fmtEuro(conti.creditoResiduo)} di crediti delle persone`
              : 'incassi + entrate − uscite − rimborsi'
          }
          tono={conti.saldo >= 0 ? 'ok' : 'danger'}
        />
        <Statistica
          etichetta="Quote incassate"
          valore={fmtEuro(conti.incassiQuote)}
          dettaglio={`${fmtEuro(conti.quoteDaIncassare)} ancora da incassare`}
          tono="ok"
        />
        <Statistica
          etichetta="Entrate a mano"
          valore={fmtEuro(conti.entrateManuali)}
          dettaglio={`${conti.entrateN} ${conti.entrateN === 1 ? 'voce' : 'voci'} a mano`}
        />
        <Statistica
          etichetta="Uscite"
          valore={fmtEuro(conti.usciteManuali)}
          dettaglio={`${conti.usciteN} ${conti.usciteN === 1 ? 'voce' : 'voci'} a mano`}
          tono={conti.usciteManuali > 0 ? 'warn' : 'neutro'}
        />
        <GiacenzaPolizze />
      </div>

      {(conti.rimborsiDaErogare > 0 || conti.rimborsiErogati > 0) && (
        <div className="mb-6 flex flex-col gap-2 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn sm:flex-row sm:items-center sm:justify-between">
          <span>
            Rimborsi: <span className="num">{fmtEuro(conti.rimborsiErogati)}</span> già restituiti
            {conti.rimborsiDaErogare > 0 && (
              <>
                , <span className="num">{fmtEuro(conti.rimborsiDaErogare)}</span> da erogare
              </>
            )}
            .
          </span>
          <Link
            href="/admin/pagamenti?filtro=rimborsi"
            className="shrink-0 font-medium underline underline-offset-4"
          >
            Vedi i rimborsi →
          </Link>
        </div>
      )}

      {/* ------------------------------------------------ registro */}
      <RegistroCassa
        voci={voci}
        origine={origine}
        indirizzo={(o) => (o === 'tutte' ? '/admin/cassa' : `/admin/cassa?origine=${o}`)}
        // correggere ed eliminare un movimento del club resta dell'admin
        modificabile={isAdmin(me.roles)}
        metodi={metodi}
        merci={merci}
        operatori={operatori}
      />
    </>
  );
}
