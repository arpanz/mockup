# App Store mockups for coding agents

Turn raw app screenshots and headlines into store-ready screenshots using Frameflow Studio templates. The renderer writes PNGs per store size, a preview contact sheet for each size, and a `.frameflow` project you can open in the web app to fine-tune. It renders with the studio's own export code, so the output matches the web app pixel for pixel.

To hand this to an agent working in another project:

> Make App Store screenshots for this app. Capture 4–6 key screens, write a short headline for each, then use `npm --prefix ~/webdev/mockup run mockups` (run it with `-- --help` first) and show me the preview.

## Quick start

Run these commands from your app project folder:

```sh
npm --prefix ~/webdev/mockup run mockups -- --list
npm --prefix ~/webdev/mockup run mockups -- --init --screens ./screenshots
# edit mockups.json: choose a template and write headlines
npm --prefix ~/webdev/mockup run mockups
```

The `mockups` command uses the folder you ran it from for relative paths. Put your screenshots there or point to another folder with `--screens`.

## `mockups.json`

All image paths are relative to the spec file. Defaults are shown in parentheses.

| Field | Meaning |
| --- | --- |
| `name` | Project name; defaults to the spec folder name. |
| `template` | Template id from `--list` (`clean-center`). |
| `sizes` | Array of size ids from `--list` (`["ios-69"]`). |
| `brandColor` | Optional six-digit hex color, e.g. `#4F46E5`. |
| `subtitles` | Optional `true` or `false`; force subtitles on or off for the set. |
| `out` | Output folder, relative to the spec (`store-screenshots`). |
| `format` | `png` or `jpeg` (`png`). |
| `scale` | `1` for store dimensions or `2` for double-size previews (`1`). |
| `screens` | Required, non-empty ordered array of screenshots. |
| `screens[].image` | Required screenshot path (`.png`, `.jpg`, `.jpeg`, `.webp`). |
| `screens[].images` | Optional object mapping size ids to alternate screenshot paths, e.g. `{"ipad-13":"ipad/home.png"}`. Other sizes use `image`. |
| `screens[].title` | Optional headline. Wrap one word in `*asterisks*` for the template accent; use `\n` to break a line. |
| `screens[].subtitle` | Optional supporting line. |

Example with five ordered screens:

```json
{
  "name": "Daylight",
  "template": "clean-center",
  "sizes": ["ios-69", "play-phone"],
  "brandColor": "#4F46E5",
  "screens": [
    { "image": "screens/01-home.png", "title": "Make room\nfor *calm*", "subtitle": "A clearer start to every day" },
    { "image": "screens/02-plan.png", "title": "Plan the week\nin *minutes*", "subtitle": "Everything in one simple view" },
    { "image": "screens/03-focus.png", "title": "Find your *focus*", "subtitle": "Keep the next step in sight" },
    { "image": "screens/04-habits.png", "title": "Build *better*\nhabits", "subtitle": "Small wins add up" },
    { "image": "screens/05-share.png", "images": { "play-phone": "android/share.png" }, "title": "Grow *together*", "subtitle": "Share progress with your people" }
  ]
}
```

An empty or missing `title`/`subtitle` hides it on that screen. For `ipad-13`, give every screen an iPad screenshot through `images`; phone screenshots in an iPad frame get heavily cropped.

## Choosing a template

`--list` prints every template with a one-line look and notes that change how your copy lands:

- **headline only**: subtitles are hidden. `"subtitles": true` shows them anyway, but these templates were designed without them.
- **slides 4, 8: no text, phone close-up**: every fourth screen is a big phone with no headline. Put a visual screen there.
- **second phone shows the next screen** / **duo**: some slides show two phones, the second showing the next screenshot.
- **panorama**: one background runs across the whole set and phones cross from one screenshot into the next. Keep the screens in story order.

`brandColor` shifts the template's colors to your hue, keeping it readable on each background.

`--template`, `--sizes`, `--scale`, `--format`, and `--out` override the spec for one run. `--spec` selects another spec file. `--init` creates a starter spec from images in `screenshots` (or the current folder); use `--screens` to choose a folder and `--force` to replace an existing spec.

## Flow sets

Use the `flow` pseudo-template when you want one continuous wave background across a story of screens. The first and last slides can act as solid-color bookends; add optional Lucide icons, icon tiles, screenshot call-outs, logos, and stickers per screen.

| `flow` option | Meaning |
| --- | --- |
| `theme` | `light` (default) or `night`, which uses an ink page and white text. |
| `bookends` | Whether the first and last slides use the solid wave color (`true` by default). |
| `tilt` | Add small rotations to bookend phones and call-outs (`false` by default). |
| `motifs` | Wave decorations: `grid`, `corners`, or both. Defaults to `["grid"]`. |
| `colors` | Optional six-digit hex overrides: `page`, `wave`, `deep`, `band`, `accent`, and `ink`. Unset colors derive from `brandColor` (default `#0B7D45`). |

Screen extras work only with `template: "flow"`:

| Extra | Meaning |
| --- | --- |
| `logo` | PNG, JPEG, WebP or SVG shown above the headline. Only on a bookend slide (usually the first). |
| `icon` | A Lucide icon name (kebab-case, e.g. `moon`) under the headline. Unknown names print a `!` warning and are left out. |
| `tiles` | Up to four `{ "icon", "label" }` tiles in a row under the headline; the phone moves down to make room. Keep labels to one word. |
| `callout` | A piece of the screenshot floated over the phone, larger than the phone shows it. `crop` is `[x, y, width, height]` in **source-screenshot pixels**; `y` is the center as a fraction of the canvas height (default `0.5`); `width` is a fraction of a phone canvas width (default `1.06`, slightly wider than the slide). |
| `sticker` | Any image on the slide: `image`, center `x`/`y` (fractions; `x` past 1 crosses into the next slide), `width` (fraction, default `0.4`), `rotation` in degrees. |

The background is drawn separately for each store size, so the wave lines up on Android and iPhone canvases alike.

```json
{
  "template": "flow",
  "flow": { "theme": "light", "bookends": true, "motifs": ["grid", "corners"] },
  "screens": [
    { "image": "screens/home.png", "logo": "assets/mark.svg", "title": "Make space for *focus*", "icon": "sparkles" },
    { "image": "screens/tasks.png", "title": "Keep work *moving*", "tiles": [{ "icon": "check", "label": "Done" }, { "icon": "clock", "label": "Soon" }], "callout": { "crop": [40, 260, 860, 320], "y": 0.48, "width": 0.94 } }
  ]
}
```

## Getting screenshots

- iOS Simulator: `xcrun simctl io booted screenshot shot.png`
- Android: `adb exec-out screencap -p > shot.png`
- Web app: capture the page at phone size, such as 430×932 at 3×. Capture the full screen, unedited, at device resolution.
- Use the same device and portrait orientation for every phone screenshot. For iPad sizes, capture iPad screenshots and map them with `images` where needed.

## Headlines that sell

- Use 2–5 words and promise a benefit instead of naming a feature.
- Accent one word with `*asterisks*`; keep the headline to at most two lines. Use `\n` to control the break.
- Keep subtitles to eight words or fewer.
- Lead with the app's core promise, then give each screenshot one idea and order the ideas by importance.

## Review loop

Lines starting with `!` in the output are warnings worth acting on: a headline the template hides, phone screenshots in a tablet frame, screenshots of the wrong shape or too low resolution.

Open `preview-<size>.jpg` for each size: the whole set side by side in one image. Check headline wrapping and accent placement, and confirm every screen shows something meaningful near the top; some templates crop screenshots from the top. Adjust the copy, template, or source images and run the command again (it replaces the previous slides in the output folder).

For hand-tuning (moving a phone, a different font, per-size tweaks), open the `.frameflow` file at https://appmockupgen.pages.dev (menu → Open project), edit, and export from there.

## Sizes

App Store requires `ios-69` (iPhone 6.9″), and `ipad-13` when the app runs on iPad. Google Play uses `play-phone`. Run `--list` for the full size table and template notes.

## Troubleshooting

- **Chrome not found:** install Google Chrome, set `FRAMEFLOW_CHROME` to its executable, or run `npx playwright-core install chromium` in the mockup folder.
- **Fonts look different:** templates load Google Fonts, so the renderer needs internet access for font downloads.
- **Startup takes a few seconds:** every run builds the studio and starts a headless Chrome before rendering (about 5–10 seconds for a set).
- **Something else failed:** add `--verbose` to see browser errors and stack traces.
