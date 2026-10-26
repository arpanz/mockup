export interface StickerField { key: string; label: string; value: string }
export interface Sticker {
  id: string; name: string;
  width: number; height: number;
  fields: StickerField[];
  svg: (color: string, text: Record<string, string>) => string;
}

export const STICKER_COLORS = ['#111827', '#D4A017', '#FFFFFF', '#4F46E5', '#0F766E', '#E11D48', '#2563EB', '#7C3AED'];

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function luminance(color: string) {
  const hex = color.replace('#', '').slice(0, 6);
  const channels = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(color: string) { return luminance(color) > 0.48 ? '#111827' : '#FFFFFF'; }
function textValue(text: Record<string, string>, key: string, fallback: string) { return escapeXml(text[key] ?? fallback); }
function doc(width: number, height: number, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}
const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const field = (key: string, label: string, value: string): StickerField => ({ key, label, value });

/** One laurel branch rising along a curve from the base, leaves alternating out and in; the right side mirrors it. */
function laurel(color: string, width: number) {
  const curve = (t: number) => {
    const u = 1 - t;
    return {
      x: u * u * 168 + 2 * u * t * 62 + t * t * 150,
      y: u * u * 226 + 2 * u * t * 132 + t * t * 26,
      dx: 2 * u * (62 - 168) + 2 * t * (150 - 62),
      dy: 2 * u * (132 - 226) + 2 * t * (26 - 132),
    };
  };
  const leaf = 'M0 0 C9 -10 9 -26 0 -36 C-9 -26 -9 -10 0 0Z';
  const parts = Array.from({ length: 9 }, (_, index) => {
    const t = 0.06 + index * 0.105;
    const { x, y, dx, dy } = curve(t);
    const along = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    const scale = 1 - index * 0.035;
    return [-38, 38].map((spread) => `<path d="${leaf}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(along + spread).toFixed(1)}) scale(${scale.toFixed(2)})"/>`).join('');
  }).join('');
  const branch = `<path d="M168 226 Q62 132 150 26" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round"/><g fill="${color}">${parts}</g>`;
  return `${branch}<g transform="translate(${width} 0) scale(-1 1)">${branch}</g>`;
}
function arrowHead(x: number, y: number, fromX: number, fromY: number, length: number) {
  const angle = Math.atan2(y - fromY, x - fromX);
  return [-0.55, 0.55].map((spread) => `M${x} ${y} L${(x - Math.cos(angle + spread) * length).toFixed(1)} ${(y - Math.sin(angle + spread) * length).toFixed(1)}`).join(' ');
}
function starPoints(cx: number, cy: number, outer: number, inner: number, count = 5) {
  return Array.from({ length: count * 2 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / count;
    const radius = index % 2 ? inner : outer;
    return `${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`;
  }).join(' ');
}
function scallopPoints(cx: number, cy: number, radius: number, bumps: number) {
  return Array.from({ length: bumps * 2 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / bumps;
    const r = index % 2 ? radius - 7 : radius;
    return `${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`;
  }).join(' ');
}
function sparkle(cx: number, cy: number, size: number) {
  return `<path d="M${cx} ${cy - size} C${cx + size * 0.16} ${cy - size * 0.16} ${cx + size * 0.16} ${cy - size * 0.16} ${cx + size} ${cy} C${cx + size * 0.16} ${cy + size * 0.16} ${cx + size * 0.16} ${cy + size * 0.16} ${cx} ${cy + size} C${cx - size * 0.16} ${cy + size * 0.16} ${cx - size * 0.16} ${cy + size * 0.16} ${cx - size} ${cy} C${cx - size * 0.16} ${cy - size * 0.16} ${cx - size * 0.16} ${cy - size * 0.16} ${cx} ${cy - size}Z"/>`;
}

export const STICKERS: Sticker[] = [
  { id: 'award', name: 'Award laurel', width: 600, height: 250, fields: [field('line1', 'Headline', 'App of the Day'), field('line2', 'Subheading', 'Featured on the App Store')], svg: (color, text) => doc(600, 250, `${laurel(color, 600)}<text x="300" y="128" fill="${color}" font-family="${font}" font-size="42" font-weight="700" text-anchor="middle">${textValue(text, 'line1', 'App of the Day')}</text><text x="300" y="164" fill="${color}" fill-opacity=".72" font-family="${font}" font-size="21" font-weight="500" text-anchor="middle">${textValue(text, 'line2', 'Featured on the App Store')}</text>`) },
  { id: 'rating', name: 'Star rating', width: 440, height: 200, fields: [field('line1', 'Rating', '4.9'), field('line2', 'Caption', '50K+ ratings')], svg: (color, text) => doc(440, 200, `${Array.from({ length: 5 }, (_, i) => `<polygon points="${starPoints(140 + i * 40, 52, 16, 7)}" fill="${color}"/>`).join('')}<text x="220" y="124" fill="${color}" font-family="${font}" font-size="48" font-weight="700" text-anchor="middle">${textValue(text, 'line1', '4.9')}</text><text x="220" y="158" fill="${color}" fill-opacity=".8" font-family="${font}" font-size="20" text-anchor="middle">${textValue(text, 'line2', '50K+ ratings')}</text>`) },
  { id: 'number-one', name: '#1 ribbon', width: 440, height: 200, fields: [field('line1', 'Number', '#1'), field('line2', 'Category', 'in Productivity')], svg: (color, text) => { const ink = contrast(color); return doc(440, 200, `<g fill="${color}" fill-opacity=".62"><path d="M14 74 H88 V170 H14 L40 122Z"/><path d="M426 74 H352 V170 H426 L400 122Z"/></g><g fill="#000000" fill-opacity=".28"><path d="M60 146 L88 170 V146Z"/><path d="M380 146 L352 170 V146Z"/></g><rect x="60" y="30" width="320" height="116" rx="14" fill="${color}"/><text x="220" y="94" fill="${ink}" font-family="${font}" font-size="54" font-weight="800" text-anchor="middle">${textValue(text, 'line1', '#1')}</text><text x="220" y="126" fill="${ink}" fill-opacity=".85" font-family="${font}" font-size="20" font-weight="600" text-anchor="middle">${textValue(text, 'line2', 'in Productivity')}</text>`); } },
  { id: 'editors-choice', name: "Editors' Choice", width: 300, height: 300, fields: [field('line1', 'First line', "Editors'"), field('line2', 'Second line', 'Choice')], svg: (color, text) => doc(300, 300, `<polygon points="${scallopPoints(150, 150, 137, 24)}" fill="${color}"/><circle cx="150" cy="150" r="113" fill="none" stroke="${contrast(color)}" stroke-opacity=".5" stroke-width="2"/><text x="150" y="141" fill="${contrast(color)}" font-family="${font}" font-size="28" font-weight="600" text-anchor="middle">${textValue(text, 'line1', "Editors'")}</text><text x="150" y="177" fill="${contrast(color)}" font-family="${font}" font-size="30" font-weight="700" text-anchor="middle">${textValue(text, 'line2', 'Choice')}</text>`) },
  { id: 'new-burst', name: 'New burst', width: 260, height: 260, fields: [field('line1', 'Text', 'NEW')], svg: (color, text) => doc(260, 260, `<polygon points="${starPoints(130, 130, 123, 103, 16)}" fill="${color}"/><text x="130" y="141" fill="${contrast(color)}" font-family="${font}" font-size="37" font-weight="800" letter-spacing="2" text-anchor="middle">${textValue(text, 'line1', 'NEW')}</text>`) },
  { id: 'arrow', name: 'Doodle arrow', width: 320, height: 220, fields: [], svg: (color) => doc(320, 220, `<path d="M30 188 C70 196 128 176 160 128 S216 50 286 46" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round"/><path d="${arrowHead(286, 46, 246, 46, 46)}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round"/>`) },
  { id: 'sparkles', name: 'Sparkles', width: 260, height: 240, fields: [], svg: (color) => doc(260, 240, `<g fill="${color}">${sparkle(124, 120, 72)}${sparkle(210, 55, 29)}${sparkle(50, 183, 22)}</g>`) },
  { id: 'circle', name: 'Scribble circle', width: 480, height: 260, fields: [], svg: (color) => doc(480, 260, `<path d="M91 126 C98 52 196 36 292 48 C379 58 422 101 403 157 C383 216 262 225 157 207 C76 194 43 158 68 101 C92 47 224 34 332 63" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/>`) },
  { id: 'underline', name: 'Swoosh underline', width: 520, height: 90, fields: [], svg: (color) => doc(520, 90, `<path d="M20 62 C130 51 279 49 406 31 C453 25 485 18 505 12 C480 38 427 53 370 62 C239 83 99 82 20 70Z" fill="${color}"/>`) },
  { id: 'heart', name: 'Heart', width: 240, height: 220, fields: [], svg: (color) => doc(240, 220, `<path d="M120 196 C100 177 31 127 31 76 C31 34 83 19 120 62 C157 19 209 34 209 76 C209 127 140 177 120 196Z" fill="${color}"/>`) },
  { id: 'check', name: 'Check badge', width: 240, height: 240, fields: [], svg: (color) => doc(240, 240, `<polygon points="${scallopPoints(120, 120, 110, 12)}" fill="${color}"/><path d="M72 122 L105 153 L170 84" fill="none" stroke="${contrast(color)}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>`) },
  { id: 'quote', name: 'Review card', width: 600, height: 250, fields: [field('line1', 'Review', '“Changed how I plan my week.”'), field('line2', 'Attribution', '— Sarah, App Store review')], svg: (color, text) => doc(600, 250, `<rect x="6" y="6" width="588" height="238" rx="28" fill="#FFFFFF" stroke="${color}" stroke-opacity=".18" stroke-width="2"/>${Array.from({ length: 5 }, (_, i) => `<polygon points="${starPoints(232 + i * 34, 62, 14, 6)}" fill="${color}"/>`).join('')}<text x="300" y="138" fill="#111827" font-family="${font}" font-size="31" font-weight="600" text-anchor="middle">${textValue(text, 'line1', '“Changed how I plan my week.”')}</text><text x="300" y="184" fill="#6B7280" font-family="${font}" font-size="21" text-anchor="middle">${textValue(text, 'line2', '— Sarah, App Store review')}</text>`) },
];

export function stickerDataUrl(svg: string) {
  // html-to-image mis-reads URL-encoded SVG on export, so encode UTF-8 bytes as base64.
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}
