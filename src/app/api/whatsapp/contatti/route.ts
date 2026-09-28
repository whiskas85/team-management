import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin, puoAmministrare } from '@/lib/domain';
import { cercaContattiWhatsapp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * La rubrica del numero WhatsApp del club, per riempire un campo telefono.
 *
 * È la rubrica di un telefono, con dentro gente che col gestionale non
 * c'entra: la vede solo chi gestisce anagrafiche, mai il socio che compila il
 * suo profilo. A tutti gli altri si risponde «non collegato», e il campo
 * resta un campo normale.
 */
export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || !(isAdmin(me.roles) || puoAmministrare(me.roles))) {
    return NextResponse.json({ collegato: false, totale: 0, contatti: [] });
  }
  const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 80);
  return NextResponse.json(await cercaContattiWhatsapp(q));
}
