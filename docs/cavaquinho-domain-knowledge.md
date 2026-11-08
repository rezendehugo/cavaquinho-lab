# Cavaquinho shape and harmony knowledge

Version 1. This file records reusable facts and the current suggestion policy. It is a compact, transcribed domain model, not a copy of a published chord catalog.

## Physical model

The instrument is tuned D-G-B-D from the fourth (lowest) string to the first (highest). At fret n, the ideal string length from the nut to the bridge is proportional to `2^(-n/12)`; the fraction of the open string occupied by the vibrating length change is `x(n)/L = 1 - 2^(-n/12)`. This is a longitudinal geometry model, not a hand-span measurement. String-to-string distances are a separate feature because nut and bridge spacing are not encoded by the fret number.

A voicing is four per-string fret states (muted, open, or fretted). A grip family is a transposition-normalized fret profile, retaining the positions of open and muted strings. A fingering is a separate assignment of left-hand fingers and barre segments to that voicing. More than one fingering may realize one grip. A barre may support higher fretted notes on intervening strings; an open or lower-fretted intervening string breaks that barre. Never infer physical difficulty or impossibility solely from fret-span distance.

Suggestion regions use the lowest pressed fret: low 1-4 (and wholly open shapes), middle 5-8, high 9-14. The diagram's full span remains visible even when the anchor selects one region. The supported working range is fret 14.

## Theory model

Recompute sounding notes and MIDI values from D-G-B-D plus absolute frets. Keep theoretical chord tones, played tones by string, duplicated tones, omissions, bass, root and inversion distinct. Complete voicings rank ahead of incomplete voicings when the defining and required tones permit it; a rootless voicing is a contextual reading, not a complete chord formula. Keep diminished triads distinct from diminished sevenths, add9 distinct from dominant 9, and half-diminished distinct from diminished.

The reference book uses a local naming convention: its C9 diagram on page 42 sounds C-E-G-D, which the app spells Cadd9. Preserve the source symbol when importing; do not reinterpret existing chord identities silently. The C9 voicing shown on page 266 sounds G-D-E-Bb and omits C; it illustrates a rootless dominant ninth voicing. The Em examples on page 130 and diminished examples around page 405 are physical references, not a comprehensive statement about every player's hand.

## Suggestion policy

Apply these priorities in order: valid chord tones and physical fingering; defining/required tone coverage; formula completeness; relative fingering and transition cost; personal preferences. A preference can order otherwise comparable candidates but cannot make an invalid voicing outrank a valid one.

The hand cost is a documented heuristic over normalized longitudinal span, fret span, finger count, barre count, and transition movement. Keep each feature inspectable and version its weights. Hard rejection is reserved for contradictory note/finger/barre assignments or explicit user hiding. “Less comfortable” adds a local penalty; favorites add a local bonus. Do not turn one user's hard grip into a universal impossibility rule.

The following are explicit positive user feedback, keyed by absolute fret profile and interpreted in chord context: A/B Em [5,4,5,5] with fingerings [2,1,3,4] and [2,1,3,3]; C C9 [5,7,5,8] [1,3,1,4]; D Em [5,9,5,5] [1,4,1,1]; E F#m [7,11,7,7] [1,4,1,1]; F C#dim [2,6,2,5] [1,4,1,3]. D and E are comfortable examples although they omit chord tones. Treat them as positive evidence about comfort, never as proof of full chord coverage.

## Regional studies

A regional exercise repeats the same harmonic steps, spelling and durations as three consecutive blocks: low, middle, high. Each step has its own region and block identity. Shape edits propagate to repeated instances of the same chord within that block only. If any chord lacks a valid suggestion in a region, show the exact missing chord and block before creation; do not silently shorten the progression.

## Provenance

Evidence types must remain labeled: interval and equal-temperament relationships are mathematical facts; rendered source diagrams and notes are reference observations; comfort weights are hypotheses; the A-F set above is personal user feedback. Source pages reviewed visually: 5, 14-15, 42, 70, 98, 130, 252, 266, 316, 384 and 405 of Lincoln Pontes, *Dicionário de Acordes para Cavaquinho*. Use those pages to verify concepts and examples, not to reproduce the catalog.
