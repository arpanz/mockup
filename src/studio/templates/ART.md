# Template background art

Backgrounds for the art-directed templates in `src/studio/templates/catalog.ts`, generated with
Codex image generation (1024×1536 portrait; `silk-panorama` is 1536×1024 for panorama sets) and
compressed with `cwebp -q 84 -m 6 -sharp_yuv`. Every prompt asked for no text, logos, devices or
people, and kept the top 20% (headline) and center (phone) calm.

| File | Template | Prompt subject |
|---|---|---|
| aurora-dark | Aurora | Aurora light ribbons in indigo, violet and cyan over near-black navy, fine film grain |
| clay-pastel | Clay Studio | Matte 3D clay spheres, arches and pills in peach, lilac and butter yellow on cream, clustered at the bottom |
| golden-hour | Golden Hour | Out-of-focus golden-hour bokeh in peach, coral and lavender, brighter at the top |
| chrome-iridescent | Chrome | Iridescent liquid-chrome ribbon through the top-right and bottom-left corners on pearl white |
| spotlight-dark | Spotlight | Charcoal studio backdrop, one soft spotlight from the top center, glossy floor reflection |
| paper-warm | Paper | Warm off-white risograph paper, fibers and grain, faint terracotta and sage wash at the edges |
| sunlit-leaves | Sunlit | Blurred palm-leaf shadows on sand-beige plaster, afternoon sun |
| holo-glass | Holo | Pastel holographic gradient with frosted-glass refraction and caustics at the edges |
| silk-panorama | Silk | Silk waves sweeping horizontally, indigo to violet to coral, darker at the bottom |
| bauhaus | Bauhaus | Flat Bauhaus circles, half circles, arcs and bars in mustard, tomato, cobalt and black on cream paper |
| memphis | Memphis | Flat Memphis squiggles, zigzags, triangles and confetti in coral, teal, lilac and lemon on blush pink |
| cutout | Cut-Out | Matisse-style paper cut-out leaves and fronds in cobalt, coral and ochre on off-white |
| riso | Riso | Risograph pink and blue color fields with heavy grain and halftone on off-white (768 px wide, q62) |
| hills | Hills | Flat layered sunrise hills, peach to plum, pale sun, apricot sky |
| stripes | Retro Stripes | 1970s rainbow stripes in orange, mustard, rust and brown curving across the bottom of cream |
| night | Night Sky | Flat indigo night sky with small stars, crescent moon and layered dark mountains |
| topo | Topo | Cream topographic contour lines on forest green, calm in the top and center |

Sample app screens in `public/samples` are rendered from `src/studio/model/sampleScreenArt.ts` with `npm run samples`.
