import type { OutputSpec } from './types';

/** Store screenshot sizes (portrait). Sources: App Store Connect & Google Play Console specs. */
export const OUTPUT_CATALOG: OutputSpec[] = [
  { id: 'ios-69', label: 'iPhone 6.9″', store: 'app-store', family: 'iphone', width: 1320, height: 2868, required: true },
  { id: 'ios-65', label: 'iPhone 6.5″', store: 'app-store', family: 'iphone', width: 1284, height: 2778 },
  { id: 'ios-63', label: 'iPhone 6.3″', store: 'app-store', family: 'iphone', width: 1206, height: 2622 },
  { id: 'ios-55', label: 'iPhone 5.5″', store: 'app-store', family: 'iphone', width: 1242, height: 2208 },
  { id: 'ipad-13', label: 'iPad 13″', store: 'app-store', family: 'ipad', width: 2064, height: 2752, required: true },
  { id: 'ipad-129', label: 'iPad 12.9″', store: 'app-store', family: 'ipad', width: 2048, height: 2732 },
  { id: 'play-phone', label: 'Android phone', store: 'play-store', family: 'android-phone', width: 1080, height: 1920 },
  { id: 'play-phone-tall', label: 'Android phone (tall)', store: 'play-store', family: 'android-phone', width: 1080, height: 2400 },
  { id: 'play-tablet-7', label: 'Android tablet 7″', store: 'play-store', family: 'android-tablet', width: 1200, height: 1920 },
  { id: 'play-tablet-10', label: 'Android tablet 10″', store: 'play-store', family: 'android-tablet', width: 1600, height: 2560 },
  { id: 'mac', label: 'Mac', store: 'mac-app-store', family: 'mac', width: 2880, height: 1800 },
];

export const outputById = (id: string) => OUTPUT_CATALOG.find((output) => output.id === id);

export const DEFAULT_OUTPUT_IDS = ['ios-69', 'ipad-13', 'play-phone'];
