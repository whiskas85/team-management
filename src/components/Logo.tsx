import { conMiniatura } from '@/lib/miniature-url';
/* eslint-disable @next/next/no-img-element */

/**
 * Logo della squadra. Si carica da «La mia squadra»; finché non c'è, la rotta
 * rimanda a quello di partenza in public/ (per Zero Dark `public/logo.jpg`).
 *
 * `src` serve a chi conosce già l'indirizzo con la versione (?v=…), così dopo
 * un cambio di logo non resta quello vecchio in memoria al browser.
 */
export function Logo({
  size = 40,
  src = '/api/squadra/logo',
  alt = 'Logo della squadra',
}: {
  size?: number;
  src?: string;
  alt?: string;
}) {
  return (
    <img
      // piccolo: la miniatura, che arriva subito; grande (l'accesso): l'originale
      src={size <= 96 ? conMiniatura(src) : src}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}
