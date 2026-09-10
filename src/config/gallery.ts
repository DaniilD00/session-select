// Gallery photo sets, one per location.
//
// Both locations ship responsive AVIF/WebP variants built by
// scripts/optimize-gallery.mjs from the originals in media-src/<location>/, so
// the browser downloads roughly the pixels it actually paints instead of the
// same fixed-width file on every screen.

import { LocationId } from "@/config/locations";

export interface GalleryImage {
  // Plain source. Used as-is when there are no responsive variants, and as the
  // <img src> fallback inside <picture> for browsers that skip the <source>s.
  src: string;
  // English description. Alt text for photos without a translated caption.
  alt: string;
  // Responsive variants live at `${base}-${width}.avif` and `.webp`.
  // Both are set together, or neither.
  base?: string;
  widths?: number[];
  // Dominant colour of the photo, painted underneath while it decodes so the
  // card never flashes an empty box.
  placeholder?: string;
  // i18n key for the translated caption. When set it is also used as the alt
  // text, so the Swedish site gets Swedish alt text.
  captionKey?: string;
}

const SOLNA_BASE = "/carousel_media/solna";
const RONNEBY_BASE = "/carousel_media/ronneby";

// Photographed at Sundbybergsvägen 1F. Order and alt text match the original
// set — only the delivery changed.
const SOLNA_IMAGES: GalleryImage[] = [
  {
    base: `${SOLNA_BASE}/solna-players-logo`,
    widths: [480], // source is only 703px wide
    src: `${SOLNA_BASE}/solna-players-logo-480.webp`,
    placeholder: "#080818",
    alt: "Players in action on the ReadyPixelGo LED arcade floor",
  },
  {
    base: `${SOLNA_BASE}/solna-full-floor`,
    widths: [480, 800],
    src: `${SOLNA_BASE}/solna-full-floor-800.webp`,
    placeholder: "#081838",
    alt: "The full interactive LED floor lit up in vivid colors",
  },
  {
    base: `${SOLNA_BASE}/solna-scoreboard-floor`,
    widths: [480, 800],
    src: `${SOLNA_BASE}/solna-scoreboard-floor-800.webp`,
    placeholder: "#184848",
    alt: "Colorful LED game floor with live scoreboard",
  },
  {
    base: `${SOLNA_BASE}/solna-player-score`,
    widths: [480, 800, 1600],
    src: `${SOLNA_BASE}/solna-player-score-800.webp`,
    placeholder: "#080818",
    alt: "Player competing on the LED floor with score display",
  },
  {
    base: `${SOLNA_BASE}/solna-head-to-head`,
    widths: [480, 800, 1600],
    src: `${SOLNA_BASE}/solna-head-to-head-800.webp`,
    placeholder: "#080828",
    alt: "Head-to-head scoreboard above the glowing game floor",
  },
  {
    base: `${SOLNA_BASE}/solna-friends-playing`,
    widths: [480, 800],
    src: `${SOLNA_BASE}/solna-friends-playing-800.webp`,
    placeholder: "#080808",
    alt: "Friends playing together on the arcade floor",
  },
];

// Photographed at Karlskronagatan 32. The two shared photos are the ones with
// guests in frame — close-ups of players rather than shots of the Solna room,
// so they carry over without misrepresenting the venue.
const RONNEBY_IMAGES: GalleryImage[] = [
  {
    base: `${RONNEBY_BASE}/ronneby-neon-floor`,
    widths: [480, 800, 1600],
    src: `${RONNEBY_BASE}/ronneby-neon-floor-800.webp`,
    placeholder: "#1a1020",
    alt: "The Ronneby LED floor and game wall lit in full colour",
    captionKey: "gallery.captions.neonFloor",
  },
  {
    base: `${RONNEBY_BASE}/ronneby-arena-wall`,
    widths: [480, 800, 1600],
    src: `${RONNEBY_BASE}/ronneby-arena-wall-800.webp`,
    placeholder: "#081848",
    alt: "Green and blue tiles lighting up ahead of the next round",
    captionKey: "gallery.captions.arenaWall",
  },
  {
    base: `${SOLNA_BASE}/solna-players-logo`,
    widths: [480],
    src: `${SOLNA_BASE}/solna-players-logo-480.webp`,
    placeholder: "#080818",
    alt: "Players in action on the ReadyPixelGo LED arcade floor",
    captionKey: "gallery.captions.logoFloor",
  },
  {
    base: `${RONNEBY_BASE}/ronneby-blue-grid`,
    widths: [480, 800],
    src: `${RONNEBY_BASE}/ronneby-blue-grid-800.webp`,
    placeholder: "#081828",
    alt: "The game room in Ronneby with floor and wall glowing blue",
    captionKey: "gallery.captions.blueGrid",
  },
  {
    base: `${SOLNA_BASE}/solna-friends-playing`,
    widths: [480, 800],
    src: `${SOLNA_BASE}/solna-friends-playing-800.webp`,
    placeholder: "#080808",
    alt: "Friends playing together on the arcade floor",
    captionKey: "gallery.captions.players",
  },
  {
    base: `${RONNEBY_BASE}/ronneby-full-room`,
    widths: [480, 800],
    src: `${RONNEBY_BASE}/ronneby-full-room-800.webp`,
    placeholder: "#687878",
    alt: "Overview of the whole Ronneby game room with the floor at full brightness",
    captionKey: "gallery.captions.fullRoom",
  },
];

export const GALLERY_IMAGES: Record<LocationId, GalleryImage[]> = {
  solna: SOLNA_IMAGES,
  ronneby: RONNEBY_IMAGES,
};

export function getGalleryImages(id: LocationId): GalleryImage[] {
  return GALLERY_IMAGES[id] ?? SOLNA_IMAGES;
}

// srcset for one format, or undefined when the photo has no variants.
export function buildSrcSet(image: GalleryImage, format: "avif" | "webp"): string | undefined {
  if (!image.base || !image.widths?.length) return undefined;
  return image.widths.map((w) => `${image.base}-${w}.${format} ${w}w`).join(", ");
}

// Smallest available file, used for the lightbox thumbnail strip.
export function thumbSrc(image: GalleryImage): string {
  if (!image.base || !image.widths?.length) return image.src;
  return `${image.base}-${Math.min(...image.widths)}.webp`;
}
