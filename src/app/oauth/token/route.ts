import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CORS, appDa, emettiToken, impronta, pkceGiusto, segretoGiusto } from '@/lib/oidc';

export const dynamic = 'force-dynamic';

const errore = (codice: string, descrizione: string, status = 400) =>
  NextResponse.json({ error: codice, error_description: descrizione }, { status, headers: CORS });

/**
 * Il codice monouso in cambio dei token. L'app si presenta col suo
 * identificativo (e il segreto, se ne ha uno), il codice, l'indirizzo di
 * ritorno usato all'inizio e il verificatore PKCE.
 */
export async function POST(req: Request) {
  let corpo: URLSearchParams;
  try {
    corpo = new URLSearchParams(await req.text());
  } catch {
    return errore('invalid_request', 'Corpo non leggibile.');
  }
  if (corpo.get('grant_type') !== 'authorization_code') {
    return errore('unsupported_grant_type', 'Solo authorization_code.');
  }

  // l'app: dall'intestazione Basic o dal corpo
  let clientId = corpo.get('client_id');
  let segreto = corpo.get('client_secret');
  const basic = req.headers.get('authorization');
  if (basic?.startsWith('Basic ')) {
    const [id, s] = Buffer.from(basic.slice(6), 'base64').toString().split(':');
    clientId = decodeURIComponent(id ?? '');
    segreto = decodeURIComponent(s ?? '');
  }
  const app = await appDa(clientId);
  if (!app || !segretoGiusto(app.segretoHash, segreto || null)) {
    return errore('invalid_client', 'App sconosciuta, spenta o segreto sbagliato.', 401);
  }

  const codice = corpo.get('code');
  const c = codice
    ? await prisma.codiceOidc.findUnique({ where: { hash: impronta(codice) } })
    : null;
  if (!c || c.appId !== app.id || c.usatoIl || c.scadeIl < new Date()) {
    return errore('invalid_grant', 'Codice non valido, già usato o scaduto.');
  }
  if (c.redirectUri !== corpo.get('redirect_uri')) {
    return errore('invalid_grant', 'L’indirizzo di ritorno non è quello di partenza.');
  }
  if (!pkceGiusto(corpo.get('code_verifier'), c.codeChallenge)) {
    return errore('invalid_grant', 'Verificatore PKCE sbagliato.');
  }
  // monouso: chi arriva secondo trova il codice già bruciato
  const bruciato = await prisma.codiceOidc.updateMany({
    where: { id: c.id, usatoIl: null },
    data: { usatoIl: new Date() },
  });
  if (bruciato.count === 0) return errore('invalid_grant', 'Codice già usato.');

  const token = await emettiToken({
    appId: app.id,
    clientId: app.clientId,
    userId: c.userId,
    scope: c.scope,
    nonce: c.nonce,
  });
  await prisma.consensoApp
    .update({
      where: { userId_appId: { userId: c.userId, appId: app.id } },
      data: { usatoIl: new Date() },
    })
    .catch(() => null);
  return NextResponse.json(token, { headers: { ...CORS, Pragma: 'no-cache' } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
