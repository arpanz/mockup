import type { ReactNode } from 'react';

export interface PatternRenderProps {
  width: number;
  height: number;
  base: string;
  colors: string[];
  scale: number;
}

export interface BackgroundPattern {
  id: string;
  name: string;
  defaultColors: string[];
  render: (props: PatternRenderProps) => ReactNode;
}

const svg = (props: PatternRenderProps, children: ReactNode, viewBox = '0 0 900 1950') => (
  <svg
    viewBox={viewBox}
    preserveAspectRatio="xMidYMid slice"
    width="100%"
    height="100%"
    aria-hidden="true"
    style={{ display: 'block' }}
  >
    <defs>
      <linearGradient id="pattern-glow" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor={props.colors[0] ?? '#FFFFFF'} stopOpacity=".07" />
        <stop offset="1" stopColor={props.colors[1] ?? '#A5B4FC'} stopOpacity=".015" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill={props.base} />
    <rect width="100%" height="100%" fill="url(#pattern-glow)" />
    {children}
  </svg>
);
const colors = (props: PatternRenderProps) => [
  props.colors[0] ?? '#FFFFFF',
  props.colors[1] ?? props.colors[0] ?? '#A5B4FC',
  props.colors[2] ?? props.colors[1] ?? '#38BDF8',
];
const patterns: BackgroundPattern[] = [
  {
    id: 'emerald-wave',
    name: 'Emerald Flow',
    defaultColors: ['#34D399', '#047857', '#A7F3D0'],
    render: (props) => {
      const [a, b, c] = colors(props);
      return svg(props, <>
        <path d="M-80 420C180 250 300 630 540 470S850 310 1020 430" fill="none" stroke={a} strokeWidth={5 * props.scale} opacity=".18" />
        <path d="M-70 570C180 400 300 780 550 620S850 460 1030 580" fill="none" stroke={b} strokeWidth={2 * props.scale} opacity=".22" />
        <path d="M-80 1290C150 1120 360 1470 600 1300S860 1170 1020 1280" fill="none" stroke={c} strokeWidth={4 * props.scale} opacity=".14" />
        <path d="M-80 1430C150 1260 360 1610 600 1440S860 1310 1020 1420" fill="none" stroke={a} strokeWidth={2 * props.scale} opacity=".18" />
      </>);
    },
  },
  {
    id: 'aurora-mesh',
    name: 'Aurora Veil',
    defaultColors: ['#34D399', '#818CF8', '#22D3EE'],
    render: (props) => {
      const [a, b, c] = colors(props);
      return svg(props, <>
        <defs><filter id="aurora-blur"><feGaussianBlur stdDeviation={52 * props.scale} /></filter></defs>
        <path d="M-100 680Q180 410 410 650T990 580V900Q700 760 440 900T-100 910Z" fill={a} opacity=".13" filter="url(#aurora-blur)" />
        <path d="M-100 790Q180 520 410 760T990 690" fill="none" stroke={b} strokeWidth={3 * props.scale} opacity=".24" />
        <path d="M-100 860Q180 590 410 830T990 760" fill="none" stroke={c} strokeWidth={2 * props.scale} opacity=".18" />
      </>);
    },
  },
  {
    id: 'cyber-grid',
    name: 'After Hours Grid',
    defaultColors: ['#22D3EE', '#818CF8', '#F0ABFC'],
    render: (props) => {
      const [a, b] = colors(props);
      return svg(props, <>
        <defs><pattern id="cyber-lines" width={72 * props.scale} height={72 * props.scale} patternUnits="userSpaceOnUse">
          <path d={`M0 0H${72 * props.scale}M0 0V${72 * props.scale}`} fill="none" stroke={a} strokeWidth={1.2 * props.scale} opacity=".16" />
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#cyber-lines)" />
        <path d="M0 1450Q450 1300 900 1450" fill="none" stroke={b} strokeWidth={2 * props.scale} opacity=".16" />
      </>);
    },
  },
  {
    id: 'glass-spheres',
    name: 'Opaline Orbs',
    defaultColors: ['#A5B4FC', '#67E8F9', '#F0ABFC'],
    render: (props) => {
      const [a, b, c] = colors(props);
      const orbs = [[180, 480, 190, a], [690, 740, 240, b], [290, 1320, 230, c], [770, 1600, 165, a]] as const;
      return svg(props, <>
        <defs>
          <radialGradient id="orb-fill" cx="30%" cy="25%">
            <stop stopColor="#FFFFFF" stopOpacity=".22" />
            <stop offset=".55" stopColor="#FFFFFF" stopOpacity=".035" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity=".01" />
          </radialGradient>
        </defs>
        {orbs.map(([x, y, radius, color], index) => <g key={index}>
          <circle cx={x} cy={y} r={radius * props.scale} fill={color} opacity=".12" />
          <circle cx={x} cy={y} r={radius * props.scale} fill="url(#orb-fill)" stroke="#FFFFFF" strokeOpacity=".19" strokeWidth={2 * props.scale} />
          <path d={`M${x - radius * .5} ${y - radius * .62}Q${x} ${y - radius * .82} ${x + radius * .35} ${y - radius * .62}`} fill="none" stroke="#FFFFFF" strokeOpacity=".2" strokeWidth={2 * props.scale} />
        </g>)}
      </>);
    },
  },
  {
    id: 'topography-contour',
    name: 'Contour Lines',
    defaultColors: ['#A7F3D0', '#34D399', '#6EE7B7'],
    render: (props) => {
      const [a, b] = colors(props);
      return svg(props, <>
        {Array.from({ length: 19 }, (_, index) => {
          const y = index * 112;
          return <path key={index} d={`M-60 ${y}C160 ${y - 130} 280 ${y + 130} 470 ${y + 20}S760 ${y - 100} 960 ${y + 30}`} fill="none" stroke={index % 3 ? a : b} strokeWidth={1.8 * props.scale} opacity=".17" />;
        })}
      </>);
    },
  },
  {
    id: 'crystal-prism',
    name: 'Faceted Light',
    defaultColors: ['#C4B5FD', '#818CF8', '#F0ABFC'],
    render: (props) => {
      const [a, b, c] = colors(props);
      return svg(props, <>
        <path d="M-40 120L340 0 230 430ZM340 0L520 210 230 430Z" fill={a} opacity=".09" />
        <path d="M500 1540L700 1160 960 1500 920 1960Z" fill={b} opacity=".08" />
        <path d="M-40 120L230 430 520 210M500 1540L700 1160 960 1500" fill="none" stroke={c} strokeWidth={2 * props.scale} opacity=".2" />
        <path d="M0 960L900 660M150 1950L820 980" fill="none" stroke="#FFFFFF" strokeWidth={1 * props.scale} opacity=".08" />
      </>);
    },
  },
  {
    id: 'dot-grid',
    name: 'Micro Dots',
    defaultColors: ['#FFFFFF'],
    render: (props) => {
      const [a] = colors(props);
      const gap = 34 * props.scale;
      return svg(props, <defs><pattern id="dot-grid" width={gap} height={gap} patternUnits="userSpaceOnUse">
        <circle cx={1.5 * props.scale} cy={1.5 * props.scale} r={1.15 * props.scale} fill={a} opacity=".19" />
      </pattern><rect width="100%" height="100%" fill="url(#dot-grid)" /></defs>);
    },
  },
  {
    id: 'line-grid',
    name: 'Fine Grid',
    defaultColors: ['#FFFFFF'],
    render: (props) => {
      const [a] = colors(props);
      const gap = 48 * props.scale;
      return svg(props, <defs><pattern id="fine-grid" width={gap} height={gap} patternUnits="userSpaceOnUse">
        <path d={`M${gap} 0H0V${gap}`} fill="none" stroke={a} strokeOpacity=".12" strokeWidth={1 * props.scale} />
      </pattern><rect width="100%" height="100%" fill="url(#fine-grid)" /></defs>);
    },
  },
  {
    id: 'diagonal-stripes',
    name: 'Silk Stripes',
    defaultColors: ['#FFFFFF'],
    render: (props) => {
      const [a] = colors(props);
      const gap = 56 * props.scale;
      return svg(props, <defs><pattern id="silk-stripes" width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <path d={`M0 0V${gap}`} stroke={a} strokeWidth={2 * props.scale} strokeOpacity=".12" />
      </pattern><rect width="100%" height="100%" fill="url(#silk-stripes)" /></defs>);
    },
  },
  {
    id: 'concentric-rings',
    name: 'Orbit Rings',
    defaultColors: ['#FFFFFF', '#A5B4FC'],
    render: (props) => {
      const [a, b] = colors(props);
      return svg(props, <>
        {Array.from({ length: 13 }, (_, index) => <circle key={index} cx="450" cy="920" r={(80 + index * 54) * props.scale} fill="none" stroke={index % 2 ? a : b} strokeWidth={2 * props.scale} opacity=".15" />)}
      </>);
    },
  },
  {
    id: 'sunburst-rays',
    name: 'Soft Radiance',
    defaultColors: ['#FDE68A', '#FB7185'],
    render: (props) => {
      const [a, b] = colors(props);
      return svg(props, <>
        <defs><radialGradient id="soft-sun"><stop stopColor={a} stopOpacity=".13" /><stop offset="1" stopColor={b} stopOpacity="0" /></radialGradient></defs>
        <circle cx="450" cy="650" r="770" fill="url(#soft-sun)" />
        {Array.from({ length: 24 }, (_, index) => {
          const angle = index * Math.PI / 12;
          const x = 450 + 1100 * Math.cos(angle);
          const y = 650 + 1100 * Math.sin(angle);
          const nextX = 450 + 1100 * Math.cos(angle + Math.PI / 24);
          const nextY = 650 + 1100 * Math.sin(angle + Math.PI / 24);
          return <path key={index} d={`M450 650L${x} ${y}L${nextX} ${nextY}Z`} fill={index % 2 ? a : b} opacity=".025" />;
        })}
      </>);
    },
  },
  {
    id: 'soft-waves',
    name: 'Tidal Layers',
    defaultColors: ['#67E8F9', '#818CF8', '#F0ABFC'],
    render: (props) => {
      const swatches = colors(props);
      return svg(props, <>
        {[0, 1, 2, 3, 4].map((index) => {
          const y = 870 + index * 142;
          return <path key={index} d={`M-50 ${y}Q200 ${y - 140} 450 ${y}T950 ${y}V1950H-50Z`} fill={swatches[index % swatches.length]} opacity=".055" />;
        })}
      </>);
    },
  },
  {
    id: 'blob-field',
    name: 'Soft Pebbles',
    defaultColors: ['#A78BFA', '#22D3EE', '#F472B6'],
    render: (props) => {
      const swatches = colors(props);
      const shapes = [[120,300,68,48],[730,430,88,54],[330,850,92,58],[820,1080,65,48],[150,1430,85,52],[620,1660,95,55]] as const;
      return svg(props, <>
        {shapes.map(([x,y,rx,ry], index) => <ellipse
          key={index}
          cx={x}
          cy={y}
          rx={rx * props.scale}
          ry={ry * props.scale}
          transform={`rotate(${index * 29} ${x} ${y})`}
          fill={swatches[index % swatches.length]}
          opacity=".12"
        />)}
      </>);
    },
  },
  {
    id: 'noise-gradient',
    name: 'Prismatic Wash',
    defaultColors: ['#818CF8', '#F472B6'],
    render: (props) => {
      const [a, b] = colors(props);
      return svg(props, <>
        <defs><linearGradient id="prismatic-wash" x2="1" y2="1">
          <stop stopColor={a} stopOpacity=".10" /><stop offset="1" stopColor={b} stopOpacity=".045" />
        </linearGradient></defs>
        <rect width="100%" height="100%" fill="url(#prismatic-wash)" />
      </>);
    },
  },
  {
    id: 'isometric-cubes',
    name: 'Isometric Forms',
    defaultColors: ['#A5B4FC', '#818CF8', '#C4B5FD'],
    render: (props) => {
      const swatches = colors(props);
      return svg(props, <>
        {Array.from({ length: 10 }, (_, index) => {
          const x = (index % 2) * 500 + 80;
          const y = Math.floor(index / 2) * 390 + 130;
          return <g key={index} transform={`translate(${x} ${y}) scale(${props.scale})`} opacity=".12">
            <path d="m0 0 90-52 90 52-90 52z" fill={swatches[0]} />
            <path d="m0 0 90 52v104L0 104z" fill={swatches[1]} />
            <path d="m180 0-90 52v104l90-52z" fill={swatches[2]} />
            <path d="m0 0 90 52 90-52M90 52v104" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity=".45" />
          </g>;
        })}
      </>);
    },
  },
  {
    id: 'confetti-shapes',
    name: 'Quiet Confetti',
    defaultColors: ['#F9A8D4', '#FDE68A', '#67E8F9'],
    render: (props) => {
      const swatches = colors(props);
      return svg(props, <>
        {Array.from({ length: 30 }, (_, index) => {
          const x = (index * 173 + 71) % 900;
          const y = (index * 317 + 130) % 1950;
          const size = (4 + (index % 4) * 1.5) * props.scale;
          return index % 3 === 0
            ? <circle key={index} cx={x} cy={y} r={size} fill={swatches[index % 3]} opacity=".24" />
            : <rect key={index} x={x} y={y} width={size * 2.4} height={size * .65} rx={size * .3} transform={`rotate(${index * 29} ${x} ${y})`} fill={swatches[index % 3]} opacity=".22" />;
        })}
      </>);
    },
  },
];

export const PATTERN_REGISTRY: BackgroundPattern[] = patterns;
export const getPattern = (id: string) => patterns.find((pattern) => pattern.id === id);
