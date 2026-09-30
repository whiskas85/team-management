'use client';

import { useEffect, useState } from 'react';
import { salvaTemaSquadra } from '@/actions/mia-squadra';
import { ACCENTI_PRONTI, aHex, tavolozza, type ModoTema, type TemaSquadra } from '@/lib/tema';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { AnteprimaTema } from './AnteprimaTema';

/**
 * I colori dominanti del logo, per proporli come accento.
 *
 * Il logo si rimpicciolisce su una tela di 48×48 e se ne contano i pixel per
 * tinta, pesati per quanto sono vivi: il nero, il bianco e i grigi non sono
 * un colore di squadra e si saltano. Restano le 4 tinte più presenti. È un
 * suggerimento: il colore lo sceglie chi guarda, non il conto.
 */
function coloriDelLogo(img: HTMLImageElement): string[] {
  const lato = 48;
  const tela = document.createElement('canvas');
  tela.width = lato;
  tela.height = lato;
  const ctx = tela.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, lato, lato);
  const { data } = ctx.getImageData(0, 0, lato, lato);
  const secchi = new Map<number, { peso: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue;
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
    if (s < 0.3 || l < 0.12 || l > 0.9) continue;
    let h = 0;
    const d = max - min;
    if (max === r / 255) h = ((g - b) / 255 / d) % 6;
    else if (max === g / 255) h = (b - r) / 255 / d + 2;
    else h = (r - g) / 255 / d + 4;
    const secchio = Math.round(((h * 60 + 360) % 360) / 20);
    const x = secchi.get(secchio) ?? { peso: 0, r: 0, g: 0, b: 0 };
    const p = s;
    secchi.set(secchio, { peso: x.peso + p, r: x.r + r * p, g: x.g + g * p, b: x.b + b * p });
  }
  return [...secchi.values()]
    .filter((x) => x.peso > 4)
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 4)
    .map((x) => aHex([x.r / x.peso, x.g / x.peso, x.b / x.peso]));
}

function Pallino({
  colore,
  nome,
  scelto,
  onScegli,
}: {
  colore: string;
  nome: string;
  scelto: boolean;
  onScegli: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onScegli}
      aria-pressed={scelto}
      title={`${nome} · ${colore}`}
      aria-label={nome}
      className={`h-9 w-9 rounded-full border-2 transition-transform ${
        scelto ? 'scale-110 border-ink' : 'border-line hover:scale-105'
      }`}
      style={{ background: colore }}
    />
  );
}

/**
 * Il tema della squadra, in «La mia squadra»: un colore d'accento — preso dal
 * logo, fra quelli pronti o libero — e scuro o chiaro. Vale per tutti.
 * L'anteprima mostra il tema vero, contrasto già sistemato compreso.
 */
export function SceltaTemaSquadra({
  iniziale,
  logoUrl,
}: {
  iniziale: TemaSquadra;
  logoUrl: string;
}) {
  const [accento, setAccento] = useState(iniziale.accento);
  const [modo, setModo] = useState<ModoTema>(iniziale.modo);
  const [dalLogo, setDalLogo] = useState<string[] | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      try {
        setDalLogo(coloriDelLogo(img));
      } catch {
        setDalLogo([]);
      }
    };
    img.onerror = () => setDalLogo([]);
    img.src = logoUrl;
  }, [logoUrl]);

  const t = tavolozza({ accento, modo });
  const adattato = t.colori.nvg.toLowerCase() !== accento.toLowerCase();

  return (
    <FormAzione azione={salvaTemaSquadra} className="grid gap-5 lg:grid-cols-2">
      <input type="hidden" name="accento" value={accento} />
      <input type="hidden" name="modo" value={modo} />
      <div className="space-y-4">
        <div>
          <p className="label">Dal logo</p>
          {dalLogo === null ? (
            <p className="text-xs text-muted">Guardo il logo…</p>
          ) : dalLogo.length === 0 ? (
            <p className="text-xs text-muted">
              Il logo non ha colori netti (è nero, bianco o grigio): scegline uno qui sotto.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {dalLogo.map((c) => (
                <Pallino
                  key={c}
                  colore={c}
                  nome={`Dal logo ${c}`}
                  scelto={c === accento}
                  onScegli={() => setAccento(c)}
                />
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="label">Pronti</p>
          <div className="flex flex-wrap gap-2">
            {ACCENTI_PRONTI.map((a) => (
              <Pallino
                key={a.colore}
                colore={a.colore}
                nome={a.nome}
                scelto={a.colore === accento}
                onScegli={() => setAccento(a.colore)}
              />
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="color"
            value={accento}
            onChange={(e) => setAccento(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded border border-line bg-surface2"
          />
          <span>
            Oppure un colore qualsiasi <span className="num text-muted">{accento}</span>
          </span>
        </label>
        <fieldset>
          <legend className="label">Fondo</legend>
          <div className="flex gap-2">
            {(['scuro', 'chiaro'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                aria-pressed={modo === m}
                className={modo === m ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
              >
                {m === 'scuro' ? 'Scuro' : 'Chiaro'}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="text-xs text-muted">
          {adattato ? (
            <>
              Così com’è, quel colore non si leggerebbe bene su questo fondo: il gestionale lo usa
              un po’ più {modo === 'scuro' ? 'chiaro' : 'scuro'} (
              <span className="num">{t.colori.nvg}</span>), come nell’anteprima.
            </>
          ) : (
            <>Il colore si legge bene su questo fondo: resta com’è.</>
          )}{' '}
          Chi ne ha bisogno può sempre scegliere un tema di accessibilità dal suo profilo.
        </p>
        <Invia icona="salva">Salva il tema</Invia>
      </div>
      <div>
        <p className="label">Anteprima</p>
        <AnteprimaTema t={t} />
      </div>
    </FormAzione>
  );
}
