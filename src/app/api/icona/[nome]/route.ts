import { NextResponse } from 'next/server';
import { iconaApp } from '@/lib/icona-app';

export const dynamic = 'force-dynamic';

/**
 * Le icone dell'app, dal logo della squadra: /api/icona/192, /api/icona/512,
 * /api/icona/maskable-512, /api/icona/apple (180). Pubbliche: le scarica il
 * telefono quando installa l'app, prima ancora dell'accesso.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ nome: string }> }) {
  const { nome } = await ctx.params;
  const forme: Record<string, [number, 'any' | 'maskable' | 'apple']> = {
    '192': [192, 'any'],
    '512': [512, 'any'],
    'maskable-512': [512, 'maskable'],
    apple: [180, 'apple'],
    '32': [32, 'any'],
  };
  const f = forme[nome.replace(/\.png$/, '')];
  if (!f) return new NextResponse('Non trovata', { status: 404 });
  const icona = await iconaApp(f[0], f[1]).catch(() => null);
  if (!icona) {
    // senza logo leggibile: le icone di partenza, che ci sono sempre
    const fisse: Record<string, string> = {
      'maskable-512': '/icona-mascherabile-512.png',
      apple: '/apple-touch-icon.png',
      '512': '/icona-512.png',
    };
    return new NextResponse(null, {
      status: 302,
      headers: { Location: fisse[nome] ?? '/icona-192.png' },
    });
  }
  return new NextResponse(new Uint8Array(icona), {
    headers: {
      'Content-Type': 'image/png',
      // l'indirizzo cambia col logo (?v=): questa si può tenere a lungo
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
