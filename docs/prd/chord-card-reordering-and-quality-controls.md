# Chord Card Quality Controls and Drag-and-Drop Reordering

## Context

The chord sequence cards currently have two usability problems:

1. Chord-quality navigation controls are misaligned when the chord has no suffix, such as `C`.
2. Card sequence reordering currently depends on visible arrow buttons, which should be replaced by drag-and-drop.

The change must preserve the existing chord-card content, layout, behavior, persistence, responsive design, and visual language.

## Problem Statement

### Quality controls

The controls used to navigate between chord qualities:

- do not occupy stable positions;
- appear poorly aligned when no suffix exists;
- have inconsistent spacing across chord-name lengths;
- may be difficult to click or tap;
- cause the chord label to appear visually off-center.

### Sequence reordering

The current ordering arrows:

- add visual noise;
- take space from important card content;
- are slower than direct manipulation;
- do not provide the expected drag-and-drop experience.

## Goals

- Keep chord names visually centered.
- Keep previous and next quality controls horizontally aligned.
- Reserve equal space for both quality controls.
- Preserve control positions for short and long chord names.
- Remove arrow-based card reordering.
- Add accessible drag-and-drop reordering.
- Preserve stable sequence item IDs.
- Persist the new order through the existing mechanism.
- Support desktop, keyboard, and touch interaction.
- Preserve all existing card content and functionality.

## Non-Goals

Do not:

- redesign the chord card;
- change chord diagrams;
- change fret positions;
- change chord-generation logic;
- change the sequence data model unless stable IDs require it;
- redesign the persistence architecture;
- alter unrelated typography, spacing, colors, or controls;
- refactor unrelated theory or practice features.

## User Stories

### Quality controls

As a user, I want the previous and next quality controls to stay aligned so I can change chord quality reliably regardless of the current chord label.

As a keyboard user, I want the quality controls to be focusable and clearly labeled.

As a mobile user, I want sufficiently large touch targets without changing the visual design substantially.

### Reordering

As a user, I want to drag a chord card to a new sequence position so I can reorganize a practice sequence directly.

As a keyboard user, I want to reorder cards without relying on a mouse.

As a mobile user, I want dragging to avoid interfering with normal vertical scrolling.

## Functional Requirements

### FR-1 - Stable quality-control layout

Render a three-part horizontal selector:

```text
[previous quality] [centered chord label] [next quality]
```

Requirements:

- equal-width control columns;
- centered complete chord label;
- no vertical stacking;
- disabled controls remain rendered;
- support short and long labels;
- use semantic buttons;
- preserve visible focus states;
- include Portuguese `aria-label` values;
- quality controls must not initiate dragging.

### FR-2 - Remove reorder arrows

Remove:

- reorder buttons;
- reorder-only handlers;
- reorder-only props;
- reorder-only styles;
- reorder-only icons;
- reorder-only tooltips;
- obsolete reorder tests.

Do not remove chord-quality navigation.

### FR-3 - Drag handle

Add a dedicated drag handle in the card header.

Requirements:

- only the handle starts dragging;
- delete, quality controls, diagram, links, and buttons must not start dragging;
- use grab and grabbing cursors;
- provide `aria-label="Reordenar acorde"`;
- show active dragging feedback;
- show intended drop position;
- avoid card-size changes.

### FR-4 - State update

Reordering must:

- update the existing sequence state;
- preserve stable item IDs;
- avoid using array indexes as React keys;
- call the existing persistence mechanism;
- survive rerendering and existing persisted flows.

### FR-5 - Input support

Support:

- mouse;
- touch;
- keyboard where supported by the selected library.

Touch must use an activation constraint so normal taps and scrolling do not initiate dragging.

### FR-6 - Responsive behavior

The implementation must work on:

- desktop;
- tablet;
- mobile;
- light theme;
- dark theme, when supported.

## Accessibility Requirements

- Semantic buttons.
- Visible focus indicators.
- Meaningful Portuguese labels.
- Keyboard-operable drag handle.
- Disabled quality controls remain discoverable but non-interactive.
- No drag behavior triggered from unrelated controls.
- Preserve logical tab order.

## Technical Approach

Use `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` because the project does not currently include a suitable drag-and-drop library.

Use:

- stable step IDs;
- `DndContext`;
- `SortableContext`;
- horizontal sorting strategy;
- pointer sensor with movement threshold;
- touch sensor with activation delay or tolerance;
- keyboard sensor with sortable keyboard coordinates.

Do not use native HTML5 drag-and-drop.

## Test Plan

Add behavior tests for:

- centered `C`;
- aligned controls with no suffix;
- aligned controls for `Bb sus4`;
- previous-quality action;
- next-quality action;
- disabled quality control;
- absence of reorder arrows;
- drag reorder;
- stable IDs after reorder;
- persistence after reorder;
- delete does not start drag;
- quality controls do not start drag;
- keyboard reorder where supported.

Also validate manually:

- duplicate chords;
- one-card sequence;
- long sequence;
- first-to-last reorder;
- last-to-first reorder;
- delete after reorder;
- quality change after reorder;
- responsive layout;
- light and dark themes.

## Acceptance Criteria

- `C` is centered with aligned quality controls.
- Longer chord labels do not shift the controls.
- Reorder arrows are removed.
- Cards can be reordered by drag and drop.
- Dragging begins only from the handle.
- Existing controls remain usable.
- Stable IDs are preserved.
- Reordered state is persisted.
- Existing card content remains unchanged.
- Tests and production build pass.

## Risks

- Duplicate chord labels may be mistaken for identifiers. Mitigation: use stable step IDs for drag items.
- Persistence may accidentally depend on array position. Mitigation: reuse existing sequence state updates and storage effects.
- Touch drag may block scroll. Mitigation: configure activation constraints.
- Drag listeners may accidentally apply to the entire card. Mitigation: bind listeners only to the handle.
- Visual centering may be affected by unequal controls. Mitigation: use equal-width selector columns.
- Tests may rely on drag-library internals. Mitigation: test user-visible reorder results and state persistence.

## Rollback Strategy

Keep quality-control layout changes separate from drag-and-drop implementation so drag-and-drop can be reverted without reverting the quality-control alignment fix.
