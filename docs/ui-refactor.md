# UI refactor notes

## Summary

This refactor cleans up the main Cavaquinho Lab practice flows: Formas, Sequências, and Braço. The goal is to reduce visual noise, remove repeated musical information, improve alignment, and consolidate chord diagram/card rendering into shared components.

## Main improvements

- Unified chord shape cards across Formas and Sequências.
- Reduced repeated chord names, tuning labels, note summaries, and oversized shape metadata.
- Made chord diagrams the visual focus inside sequence cards.
- Replaced heavy arrow buttons with subtle shared icon controls.
- Simplified add sequence and add chord actions.
- Improved Braço/fretboard alignment and removed repeated tuning display.
- Fixed chord diagrams so the thick nut line only appears in first position.

## Diagram rule

The thick top line represents the instrument nut. It should only render when the diagram starts at fret 1.

If a diagram starts at 2fr, 7fr, 8fr, or any shifted position, the top line should use normal fret styling and the starting fret label should be shown.

Chord diagrams use one stable SVG frame with an adaptive fret window. Simple shapes keep larger fret spacing, while wider shapes expand up to the dataset limit without clipping. The left gutter is reserved for shifted fret labels, and all note markers are drawn inside the grid bounds.

## Local validation

```bash
npm run lint
npm run typecheck --if-present
npm test
npm run build
```

`typecheck` is currently optional because this app is JavaScript-only and does not have a TypeScript configuration.

## Remaining technical debt

- Add visual regression examples for chord diagrams.
- Continue consolidating shared UI primitives as the app grows.
- Review future dark mode edge cases when adding pages.
