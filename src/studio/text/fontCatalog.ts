export interface FontDef {
  family: string;
  category: 'sans' | 'display' | 'serif' | 'rounded' | 'mono' | 'handwriting';
  weights: number[];
  italic: boolean;
  source: 'google' | 'system';
  tags?: string[];
}

const sans = (family: string, weights = [400, 500, 600, 700, 800], tags?: string[]): FontDef => ({
  family,
  category: 'sans',
  weights,
  italic: true,
  source: 'google',
  tags,
});
const display = (family: string, weights = [400, 500, 600, 700, 800], tags?: string[]): FontDef => ({
  family,
  category: 'display',
  weights,
  italic: true,
  source: 'google',
  tags,
});
const serif = (family: string, weights = [400, 500, 600, 700], tags?: string[]): FontDef => ({
  family,
  category: 'serif',
  weights,
  italic: true,
  source: 'google',
  tags,
});

export const FONT_CATALOG: FontDef[] = [
  sans('Inter', [100, 200, 300, 400, 500, 600, 700, 800, 900], ['clean', 'modern']),
  sans('Inter Tight', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  sans('Geist', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  sans('Plus Jakarta Sans', [200, 300, 400, 500, 600, 700, 800]),
  sans('Manrope', [200, 300, 400, 500, 600, 700, 800]),
  sans('DM Sans', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  display('Outfit', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  display('Sora', [100, 200, 300, 400, 500, 600, 700, 800]),
  display('Space Grotesk', [300, 400, 500, 600, 700]),
  display('Poppins', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  display('Montserrat', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  sans('Lexend', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  sans('Urbanist', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  sans('Figtree', [300, 400, 500, 600, 700, 800, 900]),
  sans('Onest', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  sans('Instrument Sans', [400, 500, 600, 700]),
  display('Bricolage Grotesque', [200, 300, 400, 500, 600, 700, 800]),
  sans('Schibsted Grotesk', [400, 500, 600, 700, 800, 900]),
  sans('Hanken Grotesk', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  sans('Albert Sans', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  display('Red Hat Display', [300, 400, 500, 600, 700, 800, 900]),
  sans('Rubik', [300, 400, 500, 600, 700, 800, 900]),
  sans('Nunito', [200, 300, 400, 500, 600, 700, 800, 900]),
  { family: 'Quicksand', category: 'rounded', weights: [300, 400, 500, 600, 700], italic: false, source: 'google' },
  { family: 'Fredoka', category: 'rounded', weights: [300, 400, 500, 600, 700], italic: false, source: 'google' },
  { family: 'Baloo 2', category: 'rounded', weights: [400, 500, 600, 700, 800], italic: false, source: 'google' },
  display('Syne', [400, 500, 600, 700, 800]),
  display('Unbounded', [200, 300, 400, 500, 600, 700, 800, 900]),
  sans('Archivo', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  display('Archivo Black', [400], ['bold']),
  display('Anton', [400], ['bold']),
  display('Bebas Neue', [400], ['condensed']),
  display('Oswald', [200, 300, 400, 500, 600, 700], ['condensed']),
  display('Big Shoulders Display', [100, 200, 300, 400, 500, 600, 700, 800, 900], ['condensed']),
  serif('Playfair Display', [400, 500, 600, 700, 800, 900]),
  serif('DM Serif Display', [400]),
  serif('Instrument Serif', [400]),
  serif('Fraunces', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  serif('Libre Caslon Text', [400, 700]),
  serif('Lora', [400, 500, 600, 700]),
  { family: 'JetBrains Mono', category: 'mono', weights: [100, 200, 300, 400, 500, 600, 700, 800], italic: true, source: 'google' },
  { family: 'Space Mono', category: 'mono', weights: [400, 700], italic: true, source: 'google' },
  { family: 'Caveat', category: 'handwriting', weights: [400, 500, 600, 700], italic: false, source: 'google' },
  { family: 'Kalam', category: 'handwriting', weights: [300, 400, 700], italic: false, source: 'google' },
  {
    family: 'SF Pro (system)',
    category: 'sans',
    weights: [400, 500, 600, 700, 800, 900],
    italic: true,
    source: 'system',
    tags: ['system', 'apple'],
  },
];

export function getFont(family: string): FontDef | undefined {
  return FONT_CATALOG.find((font) => font.family === family);
}

export const FONT_PAIRINGS = [
  { id: 'clean', name: 'Clean', title: { family: 'Inter', weight: 800 }, body: { family: 'Inter', weight: 500 } },
  { id: 'editorial', name: 'Editorial', title: { family: 'Instrument Serif', weight: 400 }, body: { family: 'Inter', weight: 500 } },
  { id: 'playful', name: 'Playful', title: { family: 'Fredoka', weight: 700 }, body: { family: 'Nunito', weight: 600 } },
  { id: 'bold', name: 'Bold', title: { family: 'Anton', weight: 400 }, body: { family: 'Manrope', weight: 600 } },
  { id: 'geometric', name: 'Geometric', title: { family: 'Sora', weight: 700 }, body: { family: 'DM Sans', weight: 400 } },
  { id: 'modern', name: 'Modern', title: { family: 'Space Grotesk', weight: 700 }, body: { family: 'Figtree', weight: 500 } },
  { id: 'soft', name: 'Soft', title: { family: 'Quicksand', weight: 700 }, body: { family: 'Plus Jakarta Sans', weight: 500 } },
  { id: 'fashion', name: 'Fashion', title: { family: 'Playfair Display', weight: 700 }, body: { family: 'Manrope', weight: 500 } },
  { id: 'tech', name: 'Tech', title: { family: 'Unbounded', weight: 700 }, body: { family: 'Inter', weight: 500 } },
  { id: 'condensed', name: 'Condensed', title: { family: 'Oswald', weight: 700 }, body: { family: 'Inter', weight: 500 } },
];
