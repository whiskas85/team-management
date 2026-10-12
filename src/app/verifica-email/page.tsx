import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ConfermaEmail } from '@/components/ConfermaEmail';

/**
 * Il link della verifica dell'email.
 *
 * Aprirlo non basta: serve il pulsante. I filtri antispam di molte caselle
 * aprono da soli i link delle email per controllarli, e una verifica fatta al
 * solo passaggio la darebbe per buona anche se la persona non l'ha mai vista.
 */
export default async function VerificaEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; s?: string; f?: string }>;
}) {
  const { u = '', s = '', f = '' } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-4 text-xl font-semibold">Conferma la tua email</h1>
        </div>
        <div className="card space-y-4">
          <ConfermaEmail u={u} s={s} f={f} />
          <p className="text-center text-sm">
            <Link href="/login" className="text-nvg hover:underline">
              Vai al gestionale →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
