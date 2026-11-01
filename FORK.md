# Adam's fork of open-pstack

This fork is the pinned source for the pstack plugin on Adam Vellequette's Claude Code and Codex lanes. Lauren Tan's official pstack (`cursor/plugins/pstack`) is the source of truth for content; `ericlitman/open-pstack` supplies the Claude Code and Codex translation.

- **Install ref:** branch `adam/release`. `main` mirrors `ericlitman/open-pstack` and carries no local change.
- **Sync rule:** a deliberate diff, never a blind pull. Merge upstream `main` into `adam/release`, read the diff, re-run the checks, then reinstall.
- **Design brief:** `~/.agents/harness/docs/design/pstack-front-door.md`.

## Local patches

| # | File | Change | Why |
|---|---|---|---|
| 1 | `plugins/pstack/hooks/session-start` | The poteto-mode mandate prints only while `~/.agents/pstack-front-door.on` exists (override: `PSTACK_FRONT_DOOR_FLAG`). | The kit installs before the front door switches. One file turns the router on or off for every lane, and is the stop switch afterwards. |
| 2 | `plugins/pstack/skills/correct/SKILL.md` | Drops `disable-model-invocation: true` from the frontmatter. | The router must be able to call it (decided 2026-10-04). Since port v1.8.0 the skill itself, `benchmark-checklist`, and `principle-explain-the-number` come from upstream. |
| 4 | `scripts/front-door.py`, `plugins/pstack/.front-door.json`, every `SKILL.md`, `skills/*/agents/openai.yaml` | `front-door.py passive` makes every skill explicit-only (Claude Code: `disable-model-invocation: true`; Codex: `allow_implicit_invocation: false`) and adds a read-by-path note to the router. `front-door.py active` restores the port byte for byte. The release branch shipped passive until the front-door switch on 2026-10-05; it is active since (the commit that made it so says so). | Installed skills must not steer running lanes before the front door switches. The safety review (2026-10-04) found the port lets every skill start on its own. |
| 6 | `plugins/pstack/skills/poteto-mode/scripts/orch/` (`orch.ts`, `store.ts`, `orch.test.ts`), `scripts/package.json` | Kept after Cursor pstack 0.15.36 deleted them with the agentic Orchestrate playbook; the test list keeps `orch`. | The harness's `chief-of-staff` skill runs its program against this store CLI (`PSTACK_ORCH`). The playbook text no longer names it. Dropping the files is Adam's call, after the chief-of-staff runtime moves off them. |
| 5 | `scripts/cloud-setup.sh`, `tests/cloud-setup-test.sh` | New files. The script installs the kit into a Claude Code cloud session as the personal skills-directory plugin `pstack@skills-dir`. | A cloud session loads no plugin from the Mac or from a repo's settings. See "Cloud sessions" below. |

Last upstream sync: port release `v1.16.0`, merged 2026-11-01, with Cursor pstack 0.15.30 to 0.15.36 layered on top (the November 1, 2026 update below). Patch 3 (the two router index lines) is retired: upstream's router names both skills.

## The front-door switch (slice 4 of the brief)

1. `python3 scripts/front-door.py active`, commit, push `adam/release`, reinstall on every lane.
2. `touch ~/.agents/pstack-front-door.on`.

To stop: remove the flag file. To go fully passive again: `front-door.py passive`, push, reinstall.

## Cloud sessions (slice 8 of the brief)

A Claude Code cloud session (claude.ai/code, a routine, `claude --cloud`) starts in a fresh VM. It loads no plugin from the Mac and none that a repo's settings declare. `scripts/cloud-setup.sh` puts the kit there: a cloud environment runs it before Claude Code starts, and the session then has `/pstack:<name>` as on a Mac lane.

### Install, once per Claude account

Environments belong to one claude.ai account. Do these steps signed in to each account that runs cloud sessions.

1. Copy the script: `pbcopy < scripts/cloud-setup.sh`
2. Open claude.ai/code. Select the cloud icon with the environment's name, above the message box. Select **Cloud**, hover the environment, select its settings icon.
3. Paste into **Setup script**. Keep network access at **Trusted**. Save.
4. Start a new cloud session in that environment and type `/pstack:bro`. It restates the last message in plain words.

Routines and `claude --cloud` use the same environments, so they need no extra step.

### Reference

- **What installs:** `plugins/pstack` from `adam/release`, copied to `~/.claude/skills/pstack` in the VM. The file `.cloud-kit` in that folder records the repo, branch, and commit.
- **Result line:** the setup log ends with `pstack-cloud-setup: installed <sha> ...` or `pstack-cloud-setup: SKIPPED, <reason>`. The script always exits 0, so a failed install never blocks a session.
- **Updates:** the environment caches the VM after setup. It reruns the script when the pasted text changes and after about seven days. To pull a new kit sooner, change the date in the script's header comment in the pasted copy.
- **Passive:** the kit installs exactly as the branch ships it. While the branch is passive, a person can type `/pstack:<name>`; no agent starts a skill on its own, and a routine whose prompt is only a skill name does not run it. The session hook prints nothing in the cloud because the VM has no flag file. Turning the router on in the cloud belongs to slice 4.
- **Not covered:** rules. A cloud session reads only the cloned repo's own `CLAUDE.md`, `AGENTS.md`, and `.claude/rules/`. The harness on the Mac does not reach it.
- **Secrets:** none. The fork is public, and anyone who can use an environment can read its setup script.
- **Test:** `bash tests/cloud-setup-test.sh`.
- **Codex cloud:** no step yet. OpenAI's docs say a cloud task loads skills stored in the repository and does not sync personal skills. They do not say whether an environment's install script can place skills in `$HOME/.agents/skills`. That needs a probe in a real Codex cloud task.

## October 19, 2026 update

This candidate uses released Open Pstack 1.15.0 at `39cb5e4a4d3c03e432a0dc840bcfdae0856166ac` and the shared skill changes from Cursor pstack 0.15.28 at `d457567332aa6989e753ea289f30ea2bfbc80bc0`. It is versioned `1.15.0-adam.20261019` to distinguish the fork from the released port.

The import adds create-formal-verification-skill and maintain-formal-verification-skill, updates their help and setup entry points, and includes the ketchup, sharpen and TypeScript changes since 0.15.25. Both new skills remain explicit-only in Claude and Codex. The setup offer follows the port's existing model probes and behavioral smoke; the port's installation instructions and provider mapping remain. The Cursor-only make-bot-ui, plugin manifests and guide are not installed. The router's name correction is already present in the port.

The original formal skill bodies are retained byte for byte. Their verification scope, mutation checks, reporting duties and prohibition on product edits remain intact. The shared model sheet, front-door flag, gated session hook and cloud installer are retained.

The repository-local verifier publishes only to this fork. Its feature map includes both formal skills and their Codex invocation policies. The Windows hook check first verifies silence without the fork's flag, then creates a run-owned flag before exercising the enabled hook. It never changes the operator's flag.

## November 1, 2026 update

This candidate merges released Open Pstack 1.16.0 at `dc9d157276ff9c3fdf1e4a8d3e39e714debef8b1` (Cursor pstack 0.15.29) into `adam/release`, then layers Lauren Tan's skill changes from 0.15.30 to 0.15.36 at `ae5650febf4320793844c12c4adaa937f417f8da`. It is versioned `1.16.0-adam.20261101`.

The merge keeps every fork patch in the table above and takes the port's 1.16.0 content: the 0.15.29 sync, Claude Haiku 5.5 lanes, foreground subagent waits, quiet setup reruns, the transcript folder encoding fix and the comment sweep. The layer adds `statechart` and `ketchup-video`, the adversarial `interrogate`, the agentic Orchestrate playbook, the arena cross-judge rule, and the smaller changes `CHANGES.md` lists. `UPSTREAM.md` records each commit left out and why.

Two decisions differ from the October 19 state. The orch store CLI stays as patch 6, because the harness's chief-of-staff skill depends on it. `create-formal-verification-skill` follows the port and is model-invocable on both harnesses, because setup's offer routes to it by name; its Codex explicit-only policy file is removed. `maintain-formal-verification-skill` stays typed-only on both.

Under the arena cross-judge rule, a pool whose entries are all the parent's provider skips the judge. Adam's sheet pairs Claude with Codex, so a judge always exists. Ashley's Claude-only sheet skips it, and Arena says so in its synthesis note.

The mechanical part of the layer was done with git plumbing (the port's `upstream-audit.py` and `upstream-merge.py` rules re-implemented outside the checkout): 7 paths verbatim, 408 added, 4 deleted, 3 retained, 6 clean three-way merges, 14 hand resolutions, 6 unmapped Cursor manifest and guide paths. The Bun tests, typecheck and static invariants were not run where this candidate was built; they run in the fork's CI on the pull request and must pass before `adam/release` moves.
