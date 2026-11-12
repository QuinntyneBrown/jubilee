# Jubilee stickers

Five die-cut vinyl stickers, 3″ × 3″, rendered from the
[Jubilee Stickers frame](https://www.magicpatterns.com/os/vjQEdxvHPvuznVPfxRXYfe?file=da6WEjqyG6Y7GG21CSUxFj)
in Magic Patterns. The frame is the source: the shapes, colours, type and positions in `src/` are
its components, value for value.

| Sticker | File | What it is |
|---|---|---|
| Logo | `sticker-1-logo.png` | The stacked lockup, cut to its own outline. |
| App icon | `sticker-2-app-icon.png` | The Night tile from the logo sheet, at sticker size. |
| Night badge | `sticker-3-night-badge.png` | Round, for dark laptops and cases. The edge URL follows the ring. |
| Not Sundays | `sticker-4-not-sundays.png` | "Find it in seconds, not Sundays." in a speech bubble. |
| Christian-owned | `sticker-5-christian-owned.png` | A decal for shop windows and tills, for businesses on Jubilee. |

![The whole set](contact-sheet.png)

## Print spec

| | |
|---|---|
| Canvas | 900 × 900 px, 3″ at 300 DPI |
| Background | transparent, RGBA |
| Rim | 65 px of white outside the artwork (0.217″) |
| Cut line | the outer edge of the white rim, which is the alpha edge of the PNG |
| Edge URL | `JUBILEE.TO`, Archivo 800, 28 px, tracked caps, black |

Each shape is drawn twice: first white with a fat round-joined stroke and `paint-order: stroke`,
so the overlapping pieces union into one cut outline, then the artwork on top.

Upload the print PNG to the printer, not the preview. The SVGs are for editing and for printers
who want vector; their text is live, so outline it first.

## Regenerating

```bash
node docs/stickers/render-stickers.mjs
```

Playwright is borrowed from `e2e/node_modules`, so run `npm install` in `e2e/` first. The fonts
are the bundled Archivo and Inter in `docs/design-system/assets/fonts/`. The script fails if a
font fell back to a system face, if a PNG is not 900 × 900 RGBA, if a corner is opaque, or if the
artwork touches the canvas edge.

The bundled Inter stops at weight 600, so the badge's ring text, set at 700 in the frame, is drawn
at 600.

## Files

```
docs/stickers/
  sticker-N-*.png            print-ready, transparent, 900 × 900
  sticker-N-*-preview.png    on cream with a drop shadow, for review only
  sticker-N-*.svg            standalone vector (generated)
  contact-sheet.png          the whole set at review size
  render-stickers.mjs        the renderer
  src/                       the artwork (edit these) and stickers.css
```

The business cards in `docs/business-cards/` are rendered the same way, from the
[Business Cards frame](https://www.magicpatterns.com/os/vjQEdxvHPvuznVPfxRXYfe?file=tPiXcBaPQ7aa5WiMrkM7Je),
with `node docs/business-cards/render-cards.mjs`.
