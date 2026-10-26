import { readdir, readFile, mkdir, writeFile, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { chromium, type Browser } from 'playwright-core';
import { build, preview, type PreviewServer } from 'vite';
import { DEFAULT_SIZE_IDS, DEFAULT_TEMPLATE_ID, type AgentBuildInput, type FrameflowAgent, type MockupSpec } from '../src/studio/agent/spec';
import { sizeInfos, templateInfos } from '../src/studio/agent/templateInfo';

declare global {
  interface Window {
    frameflowAgent: FrameflowAgent;
  }
}

const root = path.resolve(import.meta.dirname, '..');
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const imageMime: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const help = `Frameflow mockups: turn raw app screenshots + headlines into store-ready screenshots.

Usage (from your app's folder):
  npm --prefix ~/webdev/mockup run mockups -- --list               templates and sizes
  npm --prefix ~/webdev/mockup run mockups -- --init --screens dir write a starter mockups.json
  npm --prefix ~/webdev/mockup run mockups [-- spec.json]          render (default ./mockups.json)

mockups.json (paths relative to it):
  {
    "name": "My App",
    "template": "sky",                  see --list (default ${DEFAULT_TEMPLATE_ID})
    "sizes": ["ios-69"],                see --list (default ${DEFAULT_SIZE_IDS.join(', ')})
    "brandColor": "#4F46E5",            optional: recolor the template to your hue
    "subtitles": true,                  optional: force subtitles on/off (default: template decides)
    "out": "store-screenshots",         optional output folder
    "screens": [
      { "image": "screenshots/home.png", "title": "Plan your\\n*whole day*", "subtitle": "Tasks and calendar together" },
      { "image": "screenshots/stats.png", "images": { "ipad-13": "ipad/stats.png" }, "title": "See your *progress*" }
    ]
  }
  Title markup: *word* takes the template's accent style, \\n breaks the line. Empty title/subtitle hides it.
  "images" gives one size its own screenshot (iPad sizes need iPad screenshots).

Options:
  --out <dir>  --template <id>  --sizes a,b  --scale 1|2  --format png|jpeg   override the spec
  --spec <path>    spec file instead of the positional argument
  --list [--json]  templates (with notes like "headline only") and store sizes
  --init           write mockups.json from the images in --screens <dir> (default ./screenshots); --force overwrites
  --verbose        print browser errors

Writes <out>/<size>/01-home.png …, <out>/preview-<size>.jpg (the whole set in one image, for review)
and <out>/<name>.frameflow (open it in the web app to fine-tune by hand). Needs Google Chrome and internet (fonts).
Full guide: ~/webdev/mockup/MOCKUPS.md`;

function fail(message: string): never {
  throw new UserError(message);
}

class UserError extends Error {}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    spec: { type: 'string' }, out: { type: 'string' }, template: { type: 'string' }, sizes: { type: 'string' },
    scale: { type: 'string' }, format: { type: 'string' }, list: { type: 'boolean' }, json: { type: 'boolean' },
    init: { type: 'boolean' }, screens: { type: 'string' }, force: { type: 'boolean' }, verbose: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});
const base = path.resolve(process.env.INIT_CWD ?? process.cwd());

function printList(json: boolean) {
  const templates = templateInfos();
  const sizes = sizeInfos();
  if (json) {
    console.log(JSON.stringify({ templates, sizes }, null, 2));
    return;
  }
  console.log('Templates');
  const categories = [...new Set(templates.map((item) => item.category))];
  for (const category of categories) {
    console.log(` ${category}`);
    for (const item of templates.filter((candidate) => candidate.category === category)) {
      const flags: string[] = [];
      if (!item.subtitles) flags.push('headline only');
      if (item.textless.length) flags.push(`slides ${item.textless.join(', ')}: no text, phone close-up`);
      if (item.twoPhones.length === 8) flags.push('duo: every slide shows two phones');
      else if (item.twoPhones.length) flags.push(`slides ${item.twoPhones.join(', ')}: second phone shows the next screen`);
      if (item.panorama) flags.push('panorama');
      console.log(`  ${item.id.padEnd(16)} ${item.name} — ${item.description}${flags.length ? ` [${flags.join('; ')}]` : ''}`);
    }
  }
  console.log('\nSizes');
  for (const item of sizes) console.log(`  ${item.id.padEnd(16)} ${item.label.padEnd(20)} ${`${item.width}×${item.height}`.padEnd(10)} ${item.store}${item.required ? '  (required)' : ''}`);
}

function absoluteFrom(baseDir: string, value: string) {
  return path.resolve(baseDir, value);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '') || 'screen';
}

function safeName(value: string) {
  return value.replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').replace(/\s+/g, ' ').trim() || 'Frameflow Project';
}

function listImages(dir: string) {
  return readdir(dir, { withFileTypes: true }).then((entries) => entries
    .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
}

async function initialize(specPath: string) {
  if (!values.force) {
    try {
      await stat(specPath);
      fail(`Refusing to overwrite ${specPath}. Use --force to replace it.`);
    } catch (error) {
      if (error instanceof UserError) throw error;
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  const requestedScreens = values.screens ? absoluteFrom(base, values.screens) : absoluteFrom(base, 'screenshots');
  let screenDir = requestedScreens;
  try { await stat(screenDir); } catch { screenDir = base; }
  const names = await listImages(screenDir);
  if (!names.length) fail(`No .png, .jpg or .webp images in ${screenDir}. Pass the screenshot folder with --screens <dir>.`);
  const specDir = path.dirname(specPath);
  const screens = names.map((name) => ({ image: path.relative(specDir, path.join(screenDir, name)) || name, title: '', subtitle: '' }));
  const spec: MockupSpec = { name: path.basename(base), template: DEFAULT_TEMPLATE_ID, sizes: DEFAULT_SIZE_IDS, screens };
  await mkdir(specDir, { recursive: true });
  await writeFile(specPath, `${JSON.stringify(spec, null, 2)}\n`, { flag: values.force ? 'w' : 'wx' });
  console.log(`Wrote ${specPath} with ${screens.length} image${screens.length === 1 ? '' : 's'}.`);
  console.log('Next: pick a template (--list), write a title (and subtitle) for each screen, reorder screens so the best comes first, then render.');
}

function validateImageFile(file: string, label: string) {
  if (!imageExtensions.has(path.extname(file).toLowerCase())) fail(`${label} must be .png, .jpg, .jpeg, or .webp: ${file}`);
}

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

async function loadSpec(specPath: string) {
  let parsed: unknown;
  try { parsed = JSON.parse(await readFile(specPath, 'utf8')); }
  catch (error) {
    const reason = error instanceof SyntaxError ? error.message : (error as Error).message;
    fail(`Could not read spec ${specPath}: ${reason}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail(`Spec ${specPath} must contain a JSON object.`);
  const spec = parsed as MockupSpec;
  const specDir = path.dirname(specPath);
  const templateId = values.template ?? spec.template ?? DEFAULT_TEMPLATE_ID;
  const sizes = values.sizes !== undefined ? values.sizes.split(',').map((size) => size.trim()).filter(Boolean) : spec.sizes ?? DEFAULT_SIZE_IDS;
  const scaleText = values.scale ?? String(spec.scale ?? 1);
  const format = values.format ?? spec.format ?? 'png';
  const templates = templateInfos();
  if (!templates.some((item) => item.id === templateId)) {
    const closest = templates.map((item) => ({ id: item.id, distance: editDistance(templateId, item.id) })).sort((a, b) => a.distance - b.distance).slice(0, 3).map((item) => item.id);
    fail(`Unknown template "${templateId}". Closest: ${closest.join(', ')}. Run --list to see all templates.`);
  }
  const knownSizes = new Set(sizeInfos().map((item) => item.id));
  if (!Array.isArray(sizes) || sizes.length === 0) fail('Choose at least one size with "sizes" or --sizes. Run --list to see sizes.');
  for (const id of sizes) if (!knownSizes.has(id)) fail(`Unknown size "${id}". Run --list to see supported sizes.`);
  if (scaleText !== '1' && scaleText !== '2') fail('Scale must be 1 or 2.');
  if (format !== 'png' && format !== 'jpeg') fail('Format must be png or jpeg.');
  if (spec.brandColor !== undefined && !/^#[0-9a-f]{6}$/i.test(spec.brandColor)) fail('brandColor must be a six-digit hex color such as #4F46E5.');
  if (spec.subtitles !== undefined && typeof spec.subtitles !== 'boolean') fail('subtitles must be true or false (or left out to let the template decide).');
  if (!Array.isArray(spec.screens) || spec.screens.length === 0) fail('Spec needs a non-empty screens array. Add at least one screenshot.');
  const resolved: Array<{ image: string; images: Record<string, string>; title: string; subtitle: string }> = [];
  for (let index = 0; index < spec.screens.length; index++) {
    const screen = spec.screens[index];
    if (!screen || typeof screen.image !== 'string' || !screen.image) fail(`screens[${index}].image must be a file path.`);
    for (const key of ['title', 'subtitle'] as const) {
      if (screen[key] !== undefined && typeof screen[key] !== 'string') fail(`screens[${index}].${key} must be a string.`);
    }
    const image = absoluteFrom(specDir, screen.image);
    validateImageFile(image, `screens[${index}].image`);
    try { await stat(image); } catch { fail(`Image not found: ${image} (screens[${index}].image)`); }
    const images: Record<string, string> = {};
    for (const [id, value] of Object.entries(screen.images ?? {})) {
      if (!knownSizes.has(id)) fail(`Unknown size "${id}" in screens[${index}].images. Run --list to see supported sizes.`);
      if (typeof value !== 'string' || !value) fail(`screens[${index}].images[${id}] must be a file path.`);
      images[id] = absoluteFrom(specDir, value);
      validateImageFile(images[id], `screens[${index}].images[${id}]`);
      try { await stat(images[id]); } catch { fail(`Image not found: ${images[id]} (screens[${index}].images[${id}])`); }
    }
    resolved.push({ image, images, title: screen.title ?? '', subtitle: screen.subtitle ?? '' });
  }
  return { spec, specDir, templateId, sizes, scale: Number(scaleText) as 1 | 2, format: format as 'png' | 'jpeg', resolved };
}

async function dataUrl(file: string, cache: Map<string, { name: string; src: string }>) {
  const existing = cache.get(file);
  if (existing) return existing;
  const ext = path.extname(file).toLowerCase();
  const value = { name: path.basename(file), src: `data:${imageMime[ext]};base64,${(await readFile(file)).toString('base64')}` };
  cache.set(file, value);
  return value;
}

let server: PreviewServer | undefined;
let browser: Browser | undefined;
async function closeServices() {
  if (browser) { await browser.close().catch(() => {}); browser = undefined; }
  if (server) { await server.close().catch(() => {}); server = undefined; }
}
process.once('SIGINT', () => void closeServices().finally(() => process.exit(130)));

async function main() {
  if (values.help) { console.log(help); return; }
  if (values.list) { printList(Boolean(values.json)); return; }
  const specPath = absoluteFrom(base, values.spec ?? positionals[0] ?? 'mockups.json');
  if (values.init) { await initialize(specPath); return; }
  if (values.json) fail('--json is only used with --list.');
  const loaded = await loadSpec(specPath);
  const imagesCache = new Map<string, { name: string; src: string }>();
  const input: AgentBuildInput = {
    name: loaded.spec.name ?? path.basename(loaded.specDir),
    templateId: loaded.templateId,
    sizeIds: loaded.sizes,
    ...(loaded.spec.brandColor ? { brandColor: loaded.spec.brandColor } : {}),
    ...(loaded.spec.subtitles === undefined ? {} : { subtitles: loaded.spec.subtitles }),
    screens: await Promise.all(loaded.resolved.map(async (screen) => ({
      image: await dataUrl(screen.image, imagesCache),
      images: Object.fromEntries(await Promise.all(Object.entries(screen.images).map(async ([id, file]) => [id, await dataUrl(file, imagesCache)] as const))),
      title: screen.title,
      subtitle: screen.subtitle,
    }))),
  };
  const outDir = values.out ? absoluteFrom(base, values.out) : loaded.spec.out ? absoluteFrom(loaded.specDir, loaded.spec.out) : path.join(loaded.specDir, 'store-screenshots');
  const buildDir = path.join(root, 'node_modules/.cache/frameflow-agent');
  const started = Date.now();
  console.log(`Rendering ${input.screens.length} screenshot${input.screens.length === 1 ? '' : 's'} with "${loaded.templateId}" for ${loaded.sizes.join(', ')}…`);
  try {
    await build({ root, logLevel: 'error', build: { outDir: buildDir, emptyOutDir: true } });
    server = await preview({ root, logLevel: 'error', build: { outDir: buildDir }, preview: { host: '127.0.0.1', port: 4317, strictPort: false, open: false } });
    const url = server.resolvedUrls?.local[0];
    if (!url) fail('Vite preview did not provide a local URL.');
    try {
      browser = process.env.FRAMEFLOW_CHROME
        ? await chromium.launch({ headless: true, executablePath: process.env.FRAMEFLOW_CHROME })
        : await chromium.launch({ headless: true, channel: 'chrome' });
    }
    catch {
      try { browser = await chromium.launch({ headless: true }); }
      catch { fail('Chrome not found; install Google Chrome, set FRAMEFLOW_CHROME, or run npx playwright-core install chromium in the mockup folder.'); }
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(120_000);
    if (values.verbose) {
      page.on('pageerror', (error) => console.error(`[page] ${error.message}`));
      page.on('console', (message) => { if (message.type() === 'error') console.error(`[page] ${message.text()}`); });
    }
    await page.goto(`${url}#agent`);
    await page.waitForFunction(() => 'frameflowAgent' in window);
    const result = await page.evaluate((value) => window.frameflowAgent.build(value), input);
    for (const warning of result.warnings) console.log(`  ! ${warning}`);
    await mkdir(outDir, { recursive: true });
    let fileCount = 0;
    const previews: string[] = [];
    for (const sizeId of loaded.sizes) {
      const sizeDir = path.join(outDir, sizeId);
      await mkdir(sizeDir, { recursive: true });
      for (const name of await readdir(sizeDir)) {
        if (/^\d{2}-.*\.(png|jpe?g)$/i.test(name)) await unlink(path.join(sizeDir, name));
      }
      const sizeInfo = sizeInfos().find((item) => item.id === sizeId)!;
      const buffers: Buffer[] = [];
      for (let index = 0; index < input.screens.length; index++) {
        const encoded = await page.evaluate(({ index: slideIndex, sizeId: outputId, options }) => window.frameflowAgent.render(slideIndex, outputId, options), { index, sizeId, options: { format: loaded.format, scale: loaded.scale } });
        const buffer = Buffer.from(encoded, 'base64');
        buffers.push(buffer);
        const sourceName = path.basename(loaded.resolved[index].image, path.extname(loaded.resolved[index].image));
        const extension = loaded.format === 'jpeg' ? 'jpg' : 'png';
        const file = `${String(index + 1).padStart(2, '0')}-${slug(sourceName)}.${extension}`;
        await writeFile(path.join(sizeDir, file), buffer);
        fileCount++;
      }
      const tiles = await Promise.all(buffers.map(async (buffer) => {
        const image = await sharp(buffer).resize({ height: 800 }).toBuffer();
        const metadata = await sharp(image).metadata();
        return { image, width: metadata.width ?? 1 };
      }));
      const padding = 48;
      const gap = 32;
      const width = padding * 2 + tiles.reduce((sum, tile) => sum + tile.width, 0) + gap * Math.max(0, tiles.length - 1);
      const sheet = sharp({ create: { width, height: 800 + padding * 2, channels: 3, background: '#18181B' } });
      const composite = tiles.map((tile, index) => ({ input: tile.image, left: padding + tiles.slice(0, index).reduce((sum, prior) => sum + prior.width + gap, 0), top: padding }));
      const previewPath = path.join(outDir, `preview-${sizeId}.jpg`);
      await sheet.composite(composite).jpeg({ quality: 85 }).toFile(previewPath);
      previews.push(previewPath);
      console.log(`  ${sizeId}  ${sizeInfo.label} ${sizeInfo.width}×${sizeInfo.height}  ${buffers.length}/${input.screens.length}`);
    }
    const projectFile = await page.evaluate(() => window.frameflowAgent.projectFile());
    const projectPath = path.join(outDir, `${safeName(input.name)}.frameflow`);
    await writeFile(projectPath, projectFile);
    console.log(`\nRendered ${fileCount} screenshot files to ${outDir}`);
    console.log('Look at these to review the set:');
    for (const file of previews) console.log(`  ${file}`);
    console.log(`Open ${projectPath} at https://appmockupgen.pages.dev → menu → Open project to fine-tune by hand.`);
    console.log(`Finished in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  } finally {
    await closeServices();
  }
}

main().catch((error: unknown) => {
  if (error instanceof UserError || !values.verbose) console.error(error instanceof Error ? error.message : String(error));
  else console.error(error);
  process.exitCode = 1;
});
