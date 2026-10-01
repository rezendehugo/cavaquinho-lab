# Sequence study workspace and PDF export

The sequence page follows three steps: set an intention, build and play a map, and reflect on what to change next. Listening questions remain visible; their suggested answers are disclosed individually. Detailed harmonic analysis remains available below the journal.

## Export

Use **Baixar PDF** from Sequências or Prática > Sequência. Choose a playing map or a study guide. The map contains every occurrence in order, the selected or currently resolved automatic shape, note labels and degree colors matching the screen, absolute frets, sounding notes, omissions, beat durations, current tempo, and the loop return point. Four enlarged diagrams fit on each portrait A4 page. Vector diagrams remain sharp when zooming on a tablet. The guide adds prompts, current journal notes, writing space, suggested listening clues, and the latest recorded session.

The separate Prática > Sequência mode exports its own uniform beat-duration setting and current tempo, reflecting that mode's playback behavior. Generation runs in the browser using the existing jsPDF dependency; no server or new dependency is required.

## Journal

Drafts and up to 20 session snapshots per sequence are stored locally under `cavaquinhoLabStudy:<sequence-id>`. Existing sequence data and cloud payloads are unchanged. Notes do not sync across devices or accounts. Clearing site data removes them; the study PDF is a portable copy. Failed local-storage writes retain the in-memory draft and show a message suggesting export.

## Verification

Automated checks cover shape choice, absolute frets, occurrence order, durations, loop return, pagination, long notes, empty/missing-shape rejection, local persistence, per-sequence isolation, storage failure, download options, current tempo, and retry after export failure. The browser-generated example is `output/pdf/as-rosas-nao-falam-guia.pdf`; its chord progression is based on the supplied reference, with selected forms and illustrative practice notes. The exporter receives the currently resolved shapes and renders the same ChordDiagram SVG; it does not choose the shapes again. SVG neutral colors are adapted for white paper, with a built-in sans-serif PDF font.

Browser acceptance: verify 744px and 800px portrait widths, landscape, 390px narrow width, and 200% zoom; confirm no page overflow, all chords reachable, keyboard access to fields and disclosures, PDF download, journal reload, and sequence switching. The user approved the local Vite preview. Browser checks passed at 744px, 800px, 1280px, 390px and 372px (equivalent narrow reflow for 2x tablet zoom), with no page overflow. Keyboard chord editing and hint disclosure, journal persistence after reload, and actual guide/map downloads were verified. A manually selected Dm shape 3 was compared against the exported SVG; geometry and note-label parity are also tested for every library shape. A tablet header overlap found in live testing was fixed. Physical iPad/Samsung download and annotation behavior and actual browser 200% zoom are not tested.
