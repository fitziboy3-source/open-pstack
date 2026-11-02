---
name: statechart-diagram
description: Draws a /statechart chart (the Mermaid chart.mmd and report.md that pstack's statechart skill writes) as a hand-drawn plate in pen and coloured pencil on paper, with the reader's world set around it, ready to share as a PNG or JPG. Use whenever someone wants a statechart, state machine, flow or TLA+ model turned into a drawing, illustration, poster, "something I can show the client", a picture for a post or a deck, or asks to "draw it like the boba plates" or "make it look hand-drawn", and whenever /statechart has just produced a chart that a non-engineer will read. Also use for any Mermaid stateDiagram-v2 file, even one /statechart did not write. When its hook is installed, a note arrives right after /statechart's command has written chart.mmd, asking for this skill; follow it.
---

# Statechart diagram

A chart that TLC checked is right; a plate is the same chart drawn so that the people it is about will look
at it, keep it, and argue about it. This skill draws the chart `/statechart` wrote as a square picture in pen
and coloured pencil, in Kevin Ngo's manner (`references/technique.md` says how and why). Nothing in the model
changes: every box and arrow on the plate is one TLC explored.

## Run

Work in a scratch folder, not inside a repo. The command reads the chart and writes a folder of pictures:

```sh
node <skill dir>/scripts/plate.mjs CHART.mmd --out DIR [--fast] [options]
```

The first time on a machine, install once (Node 20 or later; downloads the renderer, the canvas and two fonts):

```sh
cd <skill dir>/scripts && npm install
```

`node <skill dir>/scripts/plate.mjs --help` lists every option and the object catalogue; read it once rather
than guessing spellings.

**Automatic hand-off from /statechart.** The pstack plugin's `after-statechart` hook watches every Bash
command and speaks once: when the `/statechart` runner has just written a `chart.mmd`, it adds a note asking
for a plate of that chart, and `/statechart`'s own hand-off asks for the same. Outside the plugin, wire the
hook once with `node <skill dir>/hooks/install.mjs` (it merges one PostToolUse entry into
`~/.claude/settings.json`, takes effect after `/hooks` is opened or on restart, and `--remove` undoes it).

`CHART.mmd` is the `chart.mmd` from a `/statechart` output folder, or any Mermaid `stateDiagram-v2`. When
`report.md` sits beside it, the plate's small line says what TLC checked ("52 states, 155 steps · 5 rules
hold"). Without `report.md` the plate carries no proof line and the small print says "a chart, not a checked
model"; say the same in your hand-off. The folder gets `plate.png` (2160 px), `plate-x.jpg` (2048 px, for a
post), `plate-preview.png` (1080 px, to look at), `plate-layout.svg` (Pele's layout) and `plate-plate.json`
(where everything landed, and every state id with its words).

## Do it in this order

1. **Get the chart.** If there is no `chart.mmd` yet, run `/statechart` first: the plate is only worth drawing
   for a chart whose rules have been checked. Read `report.md` so you know which rules hold and which break.
2. **Draw it fast, look, then decide the words.** Run with `--fast` and open `plate-preview.png` with your
   image reader. Pele wraps an arrow label at about 30 characters whatever the room, so a wrapped label is
   normal; shorten one only when its lines crowd a box or another label, with `--say "old words=new words"`
   (repeatable, aim under 30 characters for one line), never by editing `chart.mmd`, so the checked chart
   stays as written and the change is visible in the command. Keep the reader's words: "the client signs",
   not "transition fires".
3. **Check the direction.** With no `--dir`, the command lays the chart out both ways and keeps the one whose
   words come out bigger, and says so. Force `--dir TB` or `--dir LR` only when the reader's habit matters
   more than legibility (a timeline reads left to right).
4. **Set the reader's world around it.** Choose three to six things that mean something to the people the
   chart is about (the "rule broken" stamps the command adds by itself do not count), and put each beside
   the state it belongs to: `--near s7=document:signed:Contract`,
   `--near s3=stamp:APPROVED`, `--near s6=bin`, `--anywhere person:wave`. The ids are the `sN` in the chart;
   `plate-plate.json` lists them with their words. `references/objects.md` is the catalogue. The command says
   what it could not place for want of room; move that one with `--anywhere`, or drop it. For a thing the
   catalogue lacks, write a scene module (`references/scene-modules.md`, with `references/scene-example.mjs`).
5. **Write the top and bottom.** `--title` (the chart's title by default), `--subtitle` (one line under 60
   characters, what the reader should take away; longer runs into the legend), and, when the chart came from
   a repo, `--source "repo @ commit"` for the small print; leave it out otherwise. Leave `--note` alone
   unless `report.md` is missing; it is the proof line.
6. **Draw at full size, look again, deliver.** Drop `--fast`. Check the preview for words cut by arrows, a
   thing sitting on a label, or a title that ran into the legend, and fix the command, not the picture. Send
   `plate-x.jpg` for a feed or a message and `plate.png` for a deck or print. Keep the exact command, with
   the direction pinned (`--dir TB` or `--dir LR`, whichever the command said it chose): the drawing is
   seeded, so the same command draws the same plate, and a change in the model shows as a change in the
   picture and nothing else.

## When /statechart hands the chart to you

The hook's note names the `chart.mmd` just written. Finish the statechart hand-off first, as that skill asks
(the chart, each rule, each bug path), because the plate illustrates that verdict and must not replace it.
Then run the steps above without asking the user anything: `--fast`, look, choose the words and three to six
things from the model's own world (a kitchen for a remodel, a parcel for a shipment, a stamp where someone
approves), full size, and write the plate into `plate/` beside the chart folder. Add one line to the hand-off
saying the plate was drawn automatically and how to stop that (`hooks/install.mjs --remove`, or disable the
plugin's hook in `/hooks`).

## Reading the marks

The plate draws TLC's verdicts the way `/statechart` marks them: a state that breaks a rule is red with a
"rule broken" stamp beside it; one that breaks it for some values behind it is orange; states on the shortest
path to a break carry a second red outline and the arrows between them are traced in red; a state where a
property's counterexample loops has a dashed purple outline. The stamps are placed like any other thing, so
the command counts them among the things placed, and leaves one out when there is no room. The legend top right comes from the chart's own
Legend block. When you hand the plate over, name the broken rule in the reader's words and point at the red
path; the picture is the argument, your sentence is the verdict.

## When it looks wrong

- **Words tiny:** too many states or labels too long for one plate. Shorten with `--say`, try `--dir LR`, or
  ask `/statechart` for coarser state labels in its view and draw that chart.
- **Title ran into the legend:** it wraps itself at 112 mm; give a shorter `--title` and move the long form
  into `--subtitle`.
- **A thing was skipped:** there was no free room beside that state. Use `--anywhere`, or a smaller scale
  (`--near s7=document@0.7`).
- **"Font missing" or "Cannot find package":** run `npm install` in `<skill dir>/scripts`.
- **A different hand:** `--seed any-words`. Same seed, same picture.

## Hand-off

Give the reader `plate-x.jpg`, the sentence about any broken rule, the list of what was shortened with
`--say`, and the command that draws it again. Credit the technique ("after Kevin Ngo's statechart-art") and
the check ("the chart TLC checked with /statechart"); the small print carries both by default.
