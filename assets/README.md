# App icon & splash source assets

Masters for the MECHA store apps (app-conversion prep, 2026-11-18).
The mark is the Gauge M from `components/Logo.tsx`, drawn in the live
brand colors (ink `#10141b`, accent `#2563eb`, surface `#ffffff`) —
the favicon's dark tile + amber arc are the retired presentation.

| File | What it is |
|---|---|
| `logo.svg` / `logo.png` | Store icon master (1024×1024, full-bleed white) |
| `icon-foreground.svg` / `.png` | Android adaptive-icon foreground (mark in the safe zone, transparent) |
| `icon-background.svg` / `.png` | Android adaptive-icon background (solid white) |
| `splash.svg` / `splash.png` | Splash master (2732×2732, mark centered on white) |
| `splash-dark.png` | Same as splash — MECHA is a light-first brand |
| `icon-maskable.svg` | PWA maskable master (rendered into `public/icons/`) |

The vector is the source of truth — resolution is NOT a limit: the
SVG renders crisply at any size, so the 1024 store master is exact,
not an upscale.

Regenerate the platform sets after any logo change:

```sh
# fan the masters out into ios/ + android/ (icons + splashes)
npx @capacitor/assets generate
# re-sync the native projects afterwards
npx cap sync
```

The generated results live in
`ios/App/App/Assets.xcassets/AppIcon.appiconset` +
`Splash.imageset`, and `android/app/src/main/res/mipmap-*` +
`drawable-*/splash.png`, with the adaptive icon defined by
`res/mipmap-anydpi-v26/ic_launcher.xml`.
