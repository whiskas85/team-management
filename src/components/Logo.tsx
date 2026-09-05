/* eslint-disable @next/next/no-img-element */

/**
 * Logo del team. Il file sta in `public/logo.jpg` (copia di `img/ZDT Logo.jpg`):
 * per cambiarlo basta sostituire quel file, senza toccare il codice.
 */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/logo.jpg"
      alt="Zero Dark Team"
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}
