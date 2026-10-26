/** Renders the sample app screens in src/studio/model/sampleScreenArt.ts to public/samples/*.webp. */
import sharp from 'sharp';
import { SAMPLE_SCREENS } from '../src/studio/model/sampleScreenArt';

for (const { name, svg } of SAMPLE_SCREENS) {
  const file = `public/samples/${name.toLowerCase()}.webp`;
  await sharp(Buffer.from(svg()), { density: 72 }).webp({ quality: 88, effort: 6 }).toFile(file);
  console.log(file);
}
