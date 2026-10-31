import { readFile, writeFile } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { percorsoAssoluto } from '@/lib/storage';
import { firmaAvatar } from '@/lib/oidc';

/**
 * La foto profilo per le app collegate: pubblica, senza accesso né cookie,
 * perché la carica il telefono di chi usa l'app.
 *
 * Si apre solo con la firma giusta (lib/oidc, `indirizzoAvatar`): niente
 * elenco, niente indirizzi da indovinare. Cambiata la foto, cambia la firma e
 * il vecchio indirizzo smette di funzionare. Un account disabilitato non ha
 * più foto da mostrare.
 *
 * Quadrata, 512 pixel, JPEG: tagliata al centro, come la vuole un avatar. Si
 * prepara la prima volta e si tiene accanto all'originale.
 */
const LATO = 512;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await ctx.params;
  const data = file.replace(/\.jpg$/, '');
  const u = await prisma.user.findUnique({
    where: { id },
    select: { fotoPath: true, stato: true },
  });
  if (!u?.fotoPath || u.stato === 'DISABILITATO') return nonTrovata();
  const attesa = Buffer.from(firmaAvatar(id, u.fotoPath));
  const arrivata = Buffer.from(data);
  if (attesa.length !== arrivata.length || !timingSafeEqual(attesa, arrivata)) return nonTrovata();

  const pronta = percorsoAssoluto(`${u.fotoPath}.avatar.jpg`);
  let immagine: Buffer;
  try {
    immagine = await readFile(pronta);
  } catch {
    try {
      immagine = await sharp(await readFile(percorsoAssoluto(u.fotoPath)))
        .rotate()
        .resize(LATO, LATO, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
      await writeFile(pronta, immagine).catch(() => null);
    } catch {
      return nonTrovata();
    }
  }

  return new NextResponse(new Uint8Array(immagine), {
    headers: {
      'Content-Type': 'image/jpeg',
      // l'indirizzo cambia con la foto: si può tenere a lungo
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
}

const nonTrovata = () => new NextResponse('Foto non disponibile', { status: 404 });
