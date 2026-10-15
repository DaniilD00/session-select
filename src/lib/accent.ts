// Derives the theme's primary-colour tokens from a location's LED colour
// ("r, g, b"), so buttons, links and highlights follow the venue's own colour
// (green for Ronneby, red for Solna) instead of a fixed blue.

type Hsl = { h: number; s: number; l: number };

function rgbToHsl(rgb: string): Hsl {
  const [r, g, b] = rgb.split(",").map((n) => Number(n.trim()) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

const fmt = ({ h, s, l }: Hsl) => `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;

export interface AccentTokens {
  // Light surfaces (booking modal, policy pages): deep enough for white text.
  light: { primary: string; primaryHover: string; gradient: string };
  // Dark surfaces (landing page): bright, with near-black text on top.
  dark: { primary: string; primaryHover: string; gradient: string };
}

export function accentTokens(pixelColor: string): AccentTokens {
  const base = rgbToHsl(pixelColor);
  const lightPrimary = { ...base, l: Math.min(base.l, 36) };
  const darkPrimary = { ...base, l: Math.max(base.l, 50) };
  const shift = (c: Hsl, dl: number) => ({ ...c, l: c.l + dl });
  return {
    light: {
      primary: fmt(lightPrimary),
      primaryHover: fmt(shift(lightPrimary, -5)),
      gradient: `linear-gradient(135deg, hsl(${fmt(lightPrimary)}), hsl(${fmt(shift(lightPrimary, 8))}))`,
    },
    dark: {
      primary: fmt(darkPrimary),
      primaryHover: fmt(shift(darkPrimary, 6)),
      gradient: `linear-gradient(135deg, hsl(${fmt(darkPrimary)}), hsl(${fmt(shift(darkPrimary, 10))}))`,
    },
  };
}
