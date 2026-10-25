import type { Background, MeshPoint } from '../model/types';
import { PATTERN_REGISTRY } from './patterns';

export interface BackgroundPreset {
  id: string;
  name: string;
  group: 'Gradients' | 'Mesh' | 'Dark' | 'Patterns' | 'Solid';
  background: Background;
}

const lightGradients: [string, string, string, number][] = [
  ['Peach Horizon', '#FFE3D4', '#F4B7C8', 145],
  ['Lavender Haze', '#DCD7FF', '#F7DDF1', 135],
  ['Blue Hour', '#C7E7FF', '#DCD7FF', 145],
  ['Citrus Cream', '#FFF0B8', '#FFD9BF', 135],
  ['Mint Glass', '#C7F3DE', '#C4EFF2', 140],
  ['Rosewater', '#F8D8E7', '#E6D9FF', 135],
  ['Arctic Bloom', '#D6F4F7', '#C9D9FF', 145],
  ['Apricot Silk', '#FFE0B6', '#FFD0D0', 150],
  ['Sage Morning', '#E4EFCB', '#CDEBDD', 140],
  ['Cotton Candy', '#F8D6EC', '#D5E5FF', 125],
];
const vividGradients: [string, string, string, number][] = [
  ['Voltage', '#2563EB', '#DB2777', 135],
  ['Ultraviolet', '#5B21B6', '#C026D3', 145],
  ['Tropic', '#06B6D4', '#10B981', 135],
  ['Mango Pop', '#F97316', '#FACC15', 145],
  ['Candy Flame', '#EF4444', '#EC4899', 140],
  ['Laser Lime', '#84CC16', '#14B8A6', 135],
  ['Blue Raspberry', '#0284C7', '#6366F1', 145],
  ['Fuchsia Rush', '#BE185D', '#7C3AED', 135],
];
const premiumGradients: [string, string, string, number][] = [
  ['Indigo Reserve', '#11102B', '#4338CA', 140],
  ['Deep Current', '#071A2A', '#0E7490', 135],
  ['Velvet Night', '#190B22', '#7E1E70', 145],
  ['Ember Room', '#160A0A', '#9A3412', 135],
  ['Pine After Dark', '#081A15', '#166534', 145],
  ['Cobalt Noir', '#080E1F', '#1D4ED8', 135],
  ['Plum Shadow', '#160C22', '#6B21A8', 145],
  ['Carbon Glow', '#101114', '#3F3F46', 135],
];
const neutrals: [string, string, string, number][] = [
  ['Porcelain', '#FFFFFF', '#F1F1EF', 135],
  ['Warm Stone', '#D5CEC4', '#BFB8AE', 140],
  ['Graphite', '#27272A', '#111113', 135],
  ['Pure Black', '#09090B', '#000000', 135],
];

interface MeshPreset {
  name: string;
  group: 'Mesh' | 'Dark';
  base: string;
  colors: string[];
  points: [number, number, number][];
}
const meshes: MeshPreset[] = [
  { name: 'Aurora', group: 'Mesh', base: '#071525', colors: ['#0D9488', '#7C3AED', '#22D3EE', '#4338CA', '#14B8A6'], points: [[.12,.20,.65],[.78,.22,.58],[.42,.52,.62],[.86,.76,.62],[.12,.88,.58]] },
  { name: 'Sunset Bloom', group: 'Mesh', base: '#351026', colors: ['#F43F5E','#FB7185','#FDBA74','#D946EF','#F97316'], points: [[.14,.22,.62],[.78,.18,.58],[.47,.50,.68],[.88,.80,.62],[.15,.83,.58]] },
  { name: 'Lagoon', group: 'Mesh', base: '#062C3A', colors: ['#06B6D4','#2DD4BF','#2563EB','#A7F3D0','#0891B2'], points: [[.12,.15,.62],[.78,.25,.62],[.47,.50,.72],[.88,.82,.60],[.16,.84,.58]] },
  { name: 'Peach Fuzz', group: 'Mesh', base: '#552D32', colors: ['#FB923C','#FDBA74','#F472B6','#FCA5A5','#FDE68A'], points: [[.15,.16,.62],[.83,.26,.60],[.48,.52,.66],[.83,.84,.58],[.12,.82,.60]] },
  { name: 'Electric', group: 'Mesh', base: '#10113B', colors: ['#2563EB','#EC4899','#7C3AED','#06B6D4','#DB2777'], points: [[.18,.18,.62],[.82,.20,.60],[.50,.48,.68],[.86,.82,.60],[.12,.80,.58]] },
  { name: 'Matcha', group: 'Mesh', base: '#26362D', colors: ['#84A98C','#A3B18A','#E9EDC9','#588157','#DAD7CD'], points: [[.14,.18,.64],[.82,.22,.58],[.48,.50,.68],[.85,.83,.60],[.12,.84,.60]] },
  { name: 'Holo', group: 'Mesh', base: '#37314D', colors: ['#A5F3FC','#F0ABFC','#C4B5FD','#FDE68A','#99F6E4'], points: [[.13,.20,.58],[.80,.18,.58],[.48,.48,.70],[.86,.82,.60],[.14,.84,.60]] },
  { name: 'Citrus', group: 'Mesh', base: '#463811', colors: ['#FACC15','#84CC16','#FB923C','#D9F99D','#FDE047'], points: [[.12,.18,.60],[.84,.22,.60],[.48,.50,.68],[.86,.84,.58],[.12,.84,.60]] },
  { name: 'Grape Soda', group: 'Mesh', base: '#271142', colors: ['#7C3AED','#C026D3','#818CF8','#E879F9','#4F46E5'], points: [[.12,.17,.60],[.83,.20,.62],[.48,.48,.70],[.86,.82,.60],[.12,.85,.58]] },
  { name: 'Rosé', group: 'Mesh', base: '#472637', colors: ['#E879A9','#FB7185','#F9A8D4','#FDA4AF','#C084FC'], points: [[.12,.20,.62],[.82,.18,.60],[.48,.50,.68],[.87,.82,.60],[.12,.84,.60]] },
  { name: 'Oceanic', group: 'Mesh', base: '#071C35', colors: ['#0284C7','#1D4ED8','#22D3EE','#38BDF8','#4338CA'], points: [[.12,.16,.62],[.82,.22,.58],[.48,.48,.70],[.86,.82,.62],[.12,.86,.58]] },
  { name: 'Midnight Glow', group: 'Dark', base: '#0B0B14', colors: ['#4338CA','#7C3AED','#6366F1','#A855F7','#312E81'], points: [[.14,.18,.62],[.82,.22,.62],[.50,.48,.68],[.86,.82,.60],[.12,.85,.60]] },
  { name: 'Ember', group: 'Dark', base: '#100909', colors: ['#7F1D1D','#DC2626','#F97316','#991B1B','#FB923C'], points: [[.12,.18,.60],[.82,.22,.58],[.50,.50,.70],[.88,.82,.60],[.12,.84,.62]] },
  { name: 'Nordic', group: 'Dark', base: '#0B1724', colors: ['#1D4ED8','#38BDF8','#A5F3FC','#6366F1','#60A5FA'], points: [[.12,.18,.62],[.84,.20,.58],[.48,.50,.68],[.86,.84,.62],[.12,.84,.60]] },
];

const toMeshPoints = (mesh: MeshPreset): MeshPoint[] => mesh.points.map(([x, y, radius], index) => ({
  x, y, radius, color: mesh.colors[index % mesh.colors.length],
}));
const gradientPreset = ([name, start, end, angle]: [string, string, string, number], id: string, group: BackgroundPreset['group']): BackgroundPreset => ({
  id,
  name,
  group,
  background: group === 'Dark'
    ? {
        kind: 'radial',
        cx: 0.72,
        cy: 0.24,
        stops: [{ color: end, position: 0 }, { color: start, position: 1 }],
        noise: 0.06,
      }
    : {
        kind: 'linear',
        angle,
        stops: [{ color: start, position: 0 }, { color: end, position: 1 }],
        noise: 0.04,
      },
});

const solidPresets: BackgroundPreset[] = [
  ['Snow', '#FFFFFF'], ['Warm White', '#F7F3EC'], ['Soft Gray', '#E4E4E7'], ['Ink', '#09090B'],
].map(([name, color], index) => ({
  id: `solid-${index}`,
  name,
  group: 'Solid',
  background: { kind: 'solid', color, noise: 0.02 },
}));
const linearPresets = [
  ...lightGradients.map((entry, index) => gradientPreset(entry, `light-${index}`, 'Gradients')),
  ...vividGradients.map((entry, index) => gradientPreset(entry, `vivid-${index}`, 'Gradients')),
  ...premiumGradients.map((entry, index) => gradientPreset(entry, `dark-gradient-${index}`, 'Dark')),
  ...neutrals.map((entry, index) => gradientPreset(entry, `neutral-${index}`, 'Gradients')),
];
const meshPresets: BackgroundPreset[] = meshes.map((mesh, index) => ({
  id: `mesh-${index}`,
  name: mesh.name,
  group: mesh.group,
  background: { kind: 'mesh', base: mesh.base, points: toMeshPoints(mesh), noise: 0.08 },
}));
const patternPresets: BackgroundPreset[] = PATTERN_REGISTRY.map((pattern) => ({
  id: `pattern-${pattern.id}`,
  name: pattern.name,
  group: 'Patterns',
  background: {
    kind: 'pattern',
    patternId: pattern.id,
    base: '#111827',
    colors: pattern.defaultColors,
    scale: 1,
    noise: 0.04,
  },
}));

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  ...linearPresets,
  ...meshPresets,
  ...patternPresets,
  ...solidPresets,
];
