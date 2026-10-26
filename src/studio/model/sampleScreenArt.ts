/**
 * Sample screens for one believable app ("Focus", a day planner), drawn as SVG at the iPhone 6.9″ screen size
 * (1290 × 2796). They stand in for real screenshots in template previews, so each one reads as a real product:
 * real copy, real hierarchy, and a different layout per screen.
 */
export const SAMPLE_WIDTH = 1290;
export const SAMPLE_HEIGHT = 2796;
const W = SAMPLE_WIDTH;
const H = SAMPLE_HEIGHT;
const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

interface Theme {
  bg: string;
  card: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  soft: string;
}

const LIGHT = { card: '#FFFFFF', ink: '#0F172A', muted: '#64748B', line: '#E2E8F0' };

const THEMES: Array<{ name: string; theme: Theme }> = [
  { name: 'Today', theme: { ...LIGHT, bg: '#F6F7FB', accent: '#4F46E5', soft: '#E0E7FF' } },
  { name: 'Calendar', theme: { bg: '#0B1120', card: '#141C2F', ink: '#F8FAFC', muted: '#8B98AE', line: '#1F2A40', accent: '#38BDF8', soft: '#16324A' } },
  { name: 'Habits', theme: { ...LIGHT, bg: '#FFF8F1', ink: '#1C1917', muted: '#78716C', line: '#F1E4D6', accent: '#F97316', soft: '#FFEDD5' } },
  { name: 'Insights', theme: { ...LIGHT, bg: '#F2FBF5', ink: '#052E16', muted: '#4B6B57', line: '#D9EEDF', accent: '#16A34A', soft: '#DCFCE7' } },
];

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function text(x: number, y: number, size: number, weight: number, fill: string, value: string, extra = '') {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${escapeXml(value)}</text>`;
}

function statusBar(t: Theme) {
  return `${text(150, 128, 50, 600, t.ink, '9:41', 'text-anchor="middle"')}
    <g fill="${t.ink}">
      <rect x="1000" y="104" width="10" height="20" rx="3"/><rect x="1016" y="98" width="10" height="26" rx="3"/><rect x="1032" y="92" width="10" height="32" rx="3"/>
      <rect x="1074" y="92" width="80" height="36" rx="11" fill="none" stroke="${t.ink}" stroke-width="4" opacity=".5"/>
      <rect x="1081" y="99" width="58" height="22" rx="6"/><rect x="1159" y="103" width="6" height="14" rx="3" opacity=".5"/>
    </g>`;
}

const TABS = ['Today', 'Calendar', 'Habits', 'Insights'];

function tabBar(t: Theme, active: number) {
  const items = TABS.map((label, index) => {
    const cx = 220 + index * 283;
    const on = index === active;
    const color = on ? t.accent : t.muted;
    return `<rect x="${cx - 34}" y="2578" width="68" height="68" rx="${index === 0 ? 34 : 18}" fill="${on ? color : 'none'}" stroke="${color}" stroke-width="7" opacity="${on ? 1 : 0.7}"/>
      ${text(cx, 2700, 34, on ? 700 : 500, color, label, 'text-anchor="middle"')}`;
  }).join('');
  return `<rect x="0" y="2530" width="${W}" height="266" fill="${t.card}"/><rect x="0" y="2530" width="${W}" height="3" fill="${t.line}"/>${items}`;
}

function frame(t: Theme, active: number, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${t.bg}"/>${statusBar(t)}${body}${tabBar(t, active)}</svg>`;
}

/** A progress ring: `value` 0..1, drawn clockwise from 12 o'clock. */
function ring(cx: number, cy: number, r: number, width: number, value: number, track: string, color: string) {
  const length = 2 * Math.PI * r;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="${width}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-dasharray="${length * value} ${length}" transform="rotate(-90 ${cx} ${cy})"/>`;
}

function check(cx: number, cy: number, done: boolean, t: Theme, r = 34) {
  return done
    ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${t.accent}"/><path d="M${cx - 15} ${cy + 1} l10 11 l21 -23" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="none" stroke="${t.muted}" stroke-width="6" opacity=".55"/>`;
}

function chip(x: number, y: number, label: string, fill: string, color: string) {
  const width = 44 + label.length * 21;
  return `<rect x="${x}" y="${y}" width="${width}" height="58" rx="29" fill="${fill}"/>${text(x + width / 2, y + 40, 32, 600, color, label, 'text-anchor="middle"')}`;
}

function todayScreen(t: Theme) {
  const tasks = [
    { title: 'Morning planning', time: '8:30 AM', done: true },
    { title: 'Review design feedback', time: '10:00 AM', done: true },
    { title: 'Write the project brief', time: '11:30 AM', tag: ['Deep work', '#EDE9FE', '#6D28D9'] },
    { title: 'Team sync', time: '2:00 PM', tag: ['Meeting', '#E0F2FE', '#0369A1'] },
    { title: 'Leg day at the gym', time: '6:30 PM', tag: ['Health', '#DCFCE7', '#15803D'] },
  ];
  const rows = tasks.map((task, index) => {
    const y = 1220 + index * 236;
    return `<rect x="72" y="${y}" width="1146" height="208" rx="52" fill="${t.card}"/>
      ${check(160, y + 104, Boolean(task.done), t)}
      ${text(240, y + 92, 52, 650, task.done ? t.muted : t.ink, task.title, task.done ? 'text-decoration="line-through"' : '')}
      ${text(240, y + 156, 38, 500, t.muted, task.time)}
      ${task.tag ? chip(1170 - (44 + task.tag[0].length * 21), y + 75, task.tag[0], task.tag[1], task.tag[2]) : ''}`;
  }).join('');
  return frame(t, 0, `
    ${text(72, 330, 44, 600, t.muted, 'Thursday, March 12')}
    ${text(72, 440, 88, 800, t.ink, 'Good morning, Maya')}
    <circle cx="1150" cy="380" r="62" fill="${t.soft}"/>${text(1150, 400, 54, 700, t.accent, 'M', 'text-anchor="middle"')}
    <rect x="72" y="520" width="1146" height="500" rx="72" fill="${t.accent}"/>
    <circle cx="1120" cy="560" r="260" fill="#FFFFFF" opacity=".06"/>
    ${text(150, 640, 38, 700, '#FFFFFF', "TODAY'S FOCUS", 'opacity=".75" letter-spacing="4"')}
    ${text(150, 800, 150, 800, '#FFFFFF', '3h 20m')}
    ${text(150, 890, 44, 500, '#FFFFFF', 'of your 5h goal  ·  2 sessions', 'opacity=".8"')}
    ${ring(980, 770, 130, 30, 0.67, 'rgba(255,255,255,.22)', '#FFFFFF')}
    ${text(980, 790, 56, 800, '#FFFFFF', '67%', 'text-anchor="middle"')}
    ${text(72, 1150, 58, 750, t.ink, 'Up next')}
    ${text(1218, 1150, 42, 600, t.accent, '3 left', 'text-anchor="end"')}
    ${rows}`);
}

function calendarScreen(t: Theme) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, index) => {
    const cx = 150 + index * 165;
    const on = index === 3;
    return `${on ? `<rect x="${cx - 64}" y="500" width="128" height="190" rx="64" fill="${t.accent}"/>` : ''}
      ${text(cx, 568, 36, 600, on ? '#04253A' : t.muted, letter, 'text-anchor="middle"')}
      ${text(cx, 650, 54, 750, on ? '#04253A' : t.ink, String(9 + index), 'text-anchor="middle"')}
      ${index === 1 || index === 4 ? `<circle cx="${cx}" cy="710" r="7" fill="${t.accent}"/>` : ''}`;
  }).join('');
  const hourY = (hour: number) => 840 + (hour - 9) * 205;
  const hours = Array.from({ length: 9 }, (_, index) => {
    const hour = 9 + index;
    const label = `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`;
    return `${text(72, hourY(hour) + 13, 34, 500, t.muted, label)}<rect x="230" y="${hourY(hour)}" width="988" height="3" fill="${t.line}"/>`;
  }).join('');
  const events = [
    { from: 9, to: 9.75, title: 'Standup', meta: '9:00 – 9:45 · Zoom', color: '#38BDF8' },
    { from: 10, to: 12, title: 'Deep work: project brief', meta: '10:00 – 12:00 · Focus mode on', color: '#A78BFA' },
    { from: 12.5, to: 13.5, title: 'Lunch with Sam', meta: '12:30 – 1:30 · Tartine', color: '#FBBF24' },
    { from: 14, to: 15, title: 'Design review', meta: '2:00 – 3:00 · Room 4B', color: '#F472B6' },
    { from: 15.5, to: 17, title: 'Focus block', meta: '3:30 – 5:00', color: '#34D399' },
  ].map((event) => {
    const y = hourY(event.from) + 6;
    const height = (event.to - event.from) * 205 - 12;
    return `<rect x="250" y="${y}" width="968" height="${height}" rx="30" fill="${event.color}" opacity=".16"/>
      <rect x="250" y="${y}" width="12" height="${height}" rx="6" fill="${event.color}"/>
      ${text(296, y + 66, 46, 700, t.ink, event.title)}
      ${height > 150 ? text(296, y + 124, 36, 500, t.muted, event.meta) : ''}`;
  }).join('');
  const now = hourY(13.75);
  return frame(t, 1, `
    ${text(72, 330, 44, 600, t.muted, 'Week 11')}
    ${text(72, 440, 96, 800, t.ink, 'March 2026')}
    <circle cx="1150" cy="405" r="58" fill="${t.soft}"/><path d="M1150 380 v50 M1125 405 h50" stroke="${t.accent}" stroke-width="9" stroke-linecap="round"/>
    ${days}
    ${hours}
    ${events}
    <circle cx="236" cy="${now}" r="14" fill="#F43F5E"/><rect x="236" y="${now - 3}" width="982" height="6" rx="3" fill="#F43F5E"/>`);
}

function habitsScreen(t: Theme) {
  const week = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const streak = week.map((letter, index) => {
    const cx = 760 + index * 66;
    return `<circle cx="${cx}" cy="810" r="24" fill="#FFFFFF" opacity="${index < 4 ? 1 : 0.3}"/>${text(cx, 880, 28, 600, '#FFFFFF', letter, 'text-anchor="middle" opacity=".8"')}`;
  }).join('');
  const habits = [
    { name: 'Read 20 pages', goal: 'Every day', done: [1, 1, 1, 1, 0, 0, 0], color: '#6366F1', checked: true },
    { name: 'Meditate', goal: '10 min · Every day', done: [1, 1, 0, 1, 0, 0, 0], color: '#14B8A6', checked: true },
    { name: 'Walk 8,000 steps', goal: '5 days a week', done: [1, 0, 1, 1, 0, 0, 0], color: '#F97316', checked: false },
    { name: 'No phone after 10', goal: 'Weeknights', done: [1, 1, 1, 0, 0, 0, 0], color: '#EC4899', checked: false },
    { name: 'Drink 2L of water', goal: 'Every day', done: [1, 1, 1, 1, 0, 0, 0], color: '#0EA5E9', checked: true },
  ].map((habit, index) => {
    const y = 1080 + index * 276;
    const dots = habit.done.map((on, day) => `<rect x="${240 + day * 62}" y="${y + 160}" width="44" height="44" rx="14" fill="${habit.color}" opacity="${on ? 0.9 : day <= 3 ? 0.25 : 0.1}"/>`).join('');
    return `<rect x="72" y="${y}" width="1146" height="248" rx="56" fill="${t.card}"/>
      <rect x="120" y="${y + 44}" width="88" height="88" rx="28" fill="${habit.color}" opacity=".16"/><circle cx="164" cy="${y + 88}" r="18" fill="${habit.color}"/>
      ${text(240, y + 86, 50, 700, t.ink, habit.name)}
      ${text(240, y + 136, 36, 500, t.muted, habit.goal)}
      ${dots}
      ${check(1132, y + 124, habit.checked, { ...t, accent: habit.color }, 40)}`;
  }).join('');
  return frame(t, 2, `
    ${text(72, 330, 44, 600, t.muted, '3 of 5 done today')}
    ${text(72, 440, 96, 800, t.ink, 'Habits')}
    <circle cx="1150" cy="405" r="58" fill="${t.soft}"/><path d="M1150 380 v50 M1125 405 h50" stroke="${t.accent}" stroke-width="9" stroke-linecap="round"/>
    <rect x="72" y="520" width="1146" height="460" rx="72" fill="${t.accent}"/>
    <circle cx="200" cy="980" r="300" fill="#FFFFFF" opacity=".07"/>
    ${text(150, 640, 38, 700, '#FFFFFF', 'CURRENT STREAK', 'opacity=".8" letter-spacing="4"')}
    ${text(150, 820, 190, 800, '#FFFFFF', '21')}
    ${text(370, 820, 56, 700, '#FFFFFF', 'days')}
    ${text(150, 905, 40, 500, '#FFFFFF', 'Personal best: 34 days', 'opacity=".8"')}
    ${text(760, 700, 36, 600, '#FFFFFF', 'This week', 'opacity=".85"')}
    ${streak}
    ${habits}`);
}

function insightsScreen(t: Theme) {
  const values = [4.2, 5.1, 3.6, 6.4, 5.5, 2.4, 1.6];
  const bars = values.map((value, index) => {
    const x = 150 + index * 150;
    const height = value * 60;
    const best = index === 3;
    return `<rect x="${x}" y="${1560 - height}" width="88" height="${height}" rx="26" fill="${t.accent}" opacity="${best ? 1 : 0.3}"/>
      ${text(x + 44, 1620, 34, best ? 700 : 500, best ? t.ink : t.muted, ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index], 'text-anchor="middle"')}
      ${best ? `<rect x="${x - 26}" y="${1560 - height - 92}" width="140" height="66" rx="20" fill="${t.ink}"/>${text(x + 44, 1560 - height - 47, 34, 700, '#FFFFFF', '6.4h', 'text-anchor="middle"')}` : ''}`;
  }).join('');
  const areas = [
    { name: 'Deep work', hours: '14h 30m', share: 0.82, color: t.accent },
    { name: 'Meetings', hours: '9h 10m', share: 0.52, color: '#0EA5E9' },
    { name: 'Learning', hours: '5h 05m', share: 0.29, color: '#F59E0B' },
  ].map((area, index) => {
    const y = 2236 + index * 92;
    return `${text(130, y, 42, 600, t.ink, area.name)}${text(1160, y, 40, 600, t.muted, area.hours, 'text-anchor="end"')}
      <rect x="130" y="${y + 26}" width="1030" height="18" rx="9" fill="${t.line}"/><rect x="130" y="${y + 26}" width="${1030 * area.share}" height="18" rx="9" fill="${area.color}"/>`;
  }).join('');
  const segment = ['Week', 'Month', 'Year'].map((label, index) => `${index === 0 ? `<rect x="80" y="528" width="374" height="96" rx="48" fill="${t.card}"/>` : ''}${text(267 + index * 382, 590, 40, index === 0 ? 700 : 500, index === 0 ? t.ink : t.muted, label, 'text-anchor="middle"')}`).join('');
  return frame(t, 3, `
    ${text(72, 330, 44, 600, t.muted, 'March 9 – 15')}
    ${text(72, 440, 96, 800, t.ink, 'Insights')}
    <rect x="72" y="520" width="1146" height="112" rx="56" fill="${t.line}"/>${segment}
    ${text(72, 810, 150, 800, t.ink, '32h 15m')}
    ${text(72, 880, 44, 500, t.muted, 'focused this week')}
    ${chip(520, 838, '+18% vs last week', t.soft, '#15803D')}
    <rect x="72" y="950" width="1146" height="740" rx="64" fill="${t.card}"/>
    ${text(130, 1050, 46, 700, t.ink, 'Daily focus')}
    ${text(1160, 1050, 38, 500, t.muted, 'Avg 4.1h', 'text-anchor="end"')}
    ${bars}
    <rect x="72" y="1730" width="555" height="290" rx="56" fill="${t.card}"/>
    ${text(130, 1820, 38, 600, t.muted, 'Tasks done')}${text(130, 1950, 110, 800, t.ink, '47')}
    <rect x="663" y="1730" width="555" height="290" rx="56" fill="${t.card}"/>
    ${text(721, 1820, 38, 600, t.muted, 'Best day')}${text(721, 1950, 110, 800, t.ink, 'Thu')}
    <rect x="72" y="2060" width="1146" height="440" rx="56" fill="${t.card}"/>
    ${text(130, 2150, 46, 700, t.ink, 'Where your time went')}
    ${areas}`);
}

const SCREENS = [todayScreen, calendarScreen, habitsScreen, insightsScreen];

/** The sample screens as SVG source, rendered to public/samples by `npm run samples`. */
export const SAMPLE_SCREENS = THEMES.map(({ name, theme }, index) => ({ name, svg: () => SCREENS[index](theme) }));

