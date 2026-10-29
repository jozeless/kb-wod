# HM/KB installed PWA icon refresh

Branch: `feature/pwa-installed-icon-refresh`. Base: `7bf5b91` (merged PR #26).

## Artwork and outputs

The sole artwork source is `assets/branding/hmkblogo001.png`, SHA-256 `cdc6c25a8f59b0d52d5fe5c716d3284cfeaa24e6c95ba58dd1d0886c02128114`. The ZIP's original is byte-identical. The header artwork remains unchanged. Conversion retains the complete source image, its embedded glow/background, colors and aspect ratio: proportional Lanczos resizing, centered on an opaque `#212227` canvas. No cropping, recoloring, redrawing or corner rounding is baked into the PNGs.

All new files are under `assets/icons/`; their versioned URLs are distinct from the retained `icon-192.png` and `icon-512.png`.

| File | PNG size | Scaled original | Added padding per side | Purpose | Bytes |
| --- | --- | --- | --- | --- | ---: |
| `hmkb-icon-v2-192.png` | 192×192 | 180×180 | 6px | Manifest `any` | 28,445 |
| `hmkb-icon-v2-512.png` | 512×512 | 480×480 | 16px | Manifest `any` | 165,339 |
| `hmkb-maskable-v2-512.png` | 512×512 | 448×448 | 32px | Manifest `maskable` only | 146,869 |
| `hmkb-apple-touch-v2-180.png` | 180×180 | 168×168 | 6px | Apple touch icon | 25,392 |
| `hmkb-favicon-v2-32.png` | 32×32 | 30×30 | 1px | HTML favicon | 1,618 |

These are 8-bit RGB PNGs, without transparency or ancillary metadata, compressed losslessly at level 9 after resizing. Combined size is 367,663 bytes. Future artwork releases should introduce new filenames rather than reusing these icon URLs.

Regenerate with ImageMagick 7 (development tool only; no new application or npm dependency):

```sh
bash scripts/generate-pwa-icons.sh
```

## Maskable safety

The mandatory safe circle has radius 40% of the 512px canvas: 204.8px, or an 80%-diameter circle. Conservative manually reviewed bounds enclosing the entire kettlebell and rock hand in the 1254px source are `(300,210)` through `(960,1040)`. The test maps all four corners of those bounds through the actual centered icon geometry and confirms that every corner is inside the safe circle. The maximum corner radius is approximately 190.65px, leaving 14.15px additional clearance. The whole enclosed artwork therefore survives common circular Android masks; background/glow may extend outside that safe region.

Review images show the actual maskable PNG under circular and rounded-square masks. The dashed safe-circle guide exists only in the review sheet, never in the icon files or application UI.

## Manifest, HTML and offline behavior

Installed name is `Heavy Metal KB`; short name is `HM/KB`. The original manifest `id`, `start_url` and `scope` remain `./`, `display` remains `standalone`, and both theme/background colors remain `#212227`. Description and all other manifest properties remain intact. The 192/512 ordinary icons explicitly use `purpose: any`, and the separate 512 icon uses `purpose: maskable`, all `image/png` with matching sizes.

The HTML head points its favicon to the new 32px PNG, adds the 180px Apple touch link and sets the Apple installed-app title to `HM/KB`. The entire HTML body, including header artwork and navigation, stays byte-identical to main.

Service-worker cache advances v27 → v28, retaining all 72 previous precache URLs and adding the five PNGs (77 total). Install/activate/fetch handlers are unchanged. The worker still waits for existing tabs to close rather than forcing activation during workouts. Legacy icon files and the source remain available offline. Application JavaScript under `src/`, CSS, workouts, timer/audio, result/storage/IndexedDB, Auth, cloud sync, SQL and existing session records remain unchanged.

## Verification and scope

- `tests/pwa-icons.test.js`: manifest identity/names/purposes, real PNG dimensions/encoding/byte budgets, HTML links, original artwork and legacy-icon hashes, and cache references/policy.
- `tests/pwa-icons.spec.js`: native image decoding, complete-source/foreground pixel comparisons with resampling tolerance, centered opaque background, maskable safe area, Chromium manifest parsing, offline decoding of new and retained icons, all 77 cached URLs, and mask review images.
- Existing cache expectations and intentional old manifest-name/icon expectations are updated; other assertions remain intact.
- Complete Node suite: **92 passed**. Relevant Chromium mobile/desktop suite: **28 passed**, covering the new icon tests and existing app navigation/planning/offline/header/account checks. The full unrelated Playwright suite was not rerun for this asset/metadata-only change.

Review index: `/workspace/artifacts/pwa-installed-icon-refresh/index.md`. Native-decoding measurements are in `artwork-mobile.json` and `artwork-desktop.json`; the preview sheet includes ordinary, circular-mask, rounded-mask, Apple and actual-size favicon views.

Actual home-screen icon/name refresh timing is controlled by the browser and OS after a release. These checks validate manifest parsing, asset decoding and offline availability; they do not simulate a physical Android/iOS installation or promise an immediate update to existing shortcuts. The Apple touch link targets future iOS installations. No storage reset, uninstall, merge or deployment is part of this change.
