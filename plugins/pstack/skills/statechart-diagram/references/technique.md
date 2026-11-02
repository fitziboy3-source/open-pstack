# The technique

How a checked statechart becomes a drawing that a reader keeps. Kevin Ngo worked it out for his boba-shop
plates (`statechart-art`, MIT); this skill re-implements it so that any `/statechart` chart can have one.

## The four steps

1. **Model.** A TLA+ spec says what can happen, and its config lists the rules that must hold. `/statechart`
   checks it with TLC, which takes every step from every reachable state and checks each rule in each one.
2. **Chart.** `/statechart` writes the chart in Mermaid, in the words the reader uses for each state and step,
   plus `report.md`: how many states and steps TLC reached, which rules hold, which break, and the shortest
   path to each break. The plate never redraws the model: every box and arrow is one TLC checked.
3. **Lay out.** Pele (the Mermaid renderer) places the boxes and arrows, measuring every word in the plate's
   own hand font, so that words fit the boxes they will be written in. `plate.mjs` reads the places back
   out of Pele's SVG.
4. **Draw.** The kit lays the layout down on paper with simulated dry media, and sets the things of the
   reader's world around it where there is room.

## What makes it look drawn

- **Paper first.** A warm base, a fine per-pixel grain, a few fibres, a faint vignette. Everything else
  multiplies onto it, so colour sits *in* the paper rather than on top of it.
- **The pen trembles and presses.** Every line is resampled to half-millimetre steps and pushed sideways by
  slow noise (tremor); its width varies along the stroke (pressure). A box is four separate strokes that
  overshoot their corners, as a hand's do.
- **Colour is hatched, not filled.** A coloured-pencil area is a few hundred short parallel strokes at an
  angle, with random length, alpha and width, inside a clip edge that was itself jittered, then a lighter
  second pass at a slightly different angle. Multiply blending makes the overlaps darker, like real pencil.
- **Shadows are pen hatching**, offset a millimetre down and right, cut by the shape itself.
- **Nothing is placed twice in the same spot.** Words sit in gaps cut out of the arrows; things are placed only
  where no box, word or arrow is, and are skipped when there is no room (the command says which).
- **Seeded.** All randomness comes from one seed (the title by default). The same inputs draw the same
  picture, so a change in the chart shows as a change in the picture and nothing else.
- **Square, sized for a phone.** 216 mm at 10 px/mm = 2160 px; the `-x.jpg` is 2048 px for a feed.

## The colours

`/statechart` gives each state a group colour (`class s3 yellow`) and puts the group names in a Legend block.
The plate draws the legend by hand from that block and uses stronger pencil versions of the same colours, so
the hatching reads. Marks are drawn the way TLC's report means them:

| mark on a state | on the plate |
|---|---|
| `breaks` (the rule fails here) | red pencil fill, red pen, a "rule broken" stamp beside it when there is room |
| `mayBreak` (fails for some values behind this box) | orange fill and pen, a "may break" stamp |
| `bugPath` (on the shortest path to a break) | a second red outline; arrows between two such states are drawn in red with a pink wash |
| `repeats` (a property's counterexample loops here) | a dashed purple outline |

## Knobs worth knowing

- **Words.** The chart's words are the reader's, so keep them. When a label is too long to sit on an arrow,
  shorten it with `--say "old words=new words"` rather than editing `chart.mmd`, so the checked chart stays as
  TLC wrote it and the change is visible in the command.
- **Direction.** Tall charts (many states in a line) read best top to bottom; wide ones (few ranks, many
  siblings) left to right. `--dir LR` flips it. The chart is scaled to fit either way; if the words come out
  small, there are too many states for one plate, or the labels are too long.
- **Spacing.** `--spacing 26,36` is Pele's rank and node spacing. Tighter spacing means bigger words on the
  plate, until arrows start to crowd the labels.
- **Things.** Choose objects that mean something in the reader's world and put each beside the state it
  belongs to (`--near s7=document:signed`). Three to six is plenty; a plate is not a sticker sheet.
- **Seed.** Change `--seed` to get a different hand; keep it to keep the picture.

## Credits

Technique: Kevin Ngo, *The business of boba* (statechart-art, MIT). Charts: the pstack `/statechart` skill by
Lauren Tan. Layout: Pele (MIT). Drawing: `@napi-rs/canvas` (MIT). Fonts: Caveat and Patrick Hand (SIL Open
Font License) via `@fontsource`. The code here is its own, MIT-licensed re-implementation.
