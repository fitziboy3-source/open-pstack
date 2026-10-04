# Adam's fork of open-pstack

This fork is the pinned source for the pstack plugin on Adam Vellequette's Claude Code and Codex lanes. Lauren Tan's official pstack (`cursor/plugins/pstack`) is the source of truth for content; `ericlitman/open-pstack` supplies the Claude Code and Codex translation.

- **Install ref:** branch `adam/release`. `main` mirrors `ericlitman/open-pstack` and carries no local change.
- **Sync rule:** a deliberate diff, never a blind pull. Merge upstream `main` into `adam/release`, read the diff, re-run the checks, then reinstall.
- **Design brief:** `~/.agents/harness/docs/design/pstack-front-door.md`.

## Local patches

| # | File | Change | Why |
|---|---|---|---|
| 1 | `plugins/pstack/hooks/session-start` | The poteto-mode mandate prints only while `~/.agents/pstack-front-door.on` exists (override: `PSTACK_FRONT_DOOR_FLAG`). | The kit installs before the front door switches. One file turns the router on or off for every lane, and is the stop switch afterwards. |
| 2 | `plugins/pstack/skills/correct/`, `benchmark-checklist/`, `principle-explain-the-number/` | Added from her upstream `cursor/plugins` at `e43c7ee` (v0.15.9). Frontmatter follows this port's convention: principles are `user-invocable: false`; the other two drop `disable-model-invocation` so the router can call them. | The port is synced to her v0.15.5 and lacks her three newer skills. |
| 3 | `plugins/pstack/skills/poteto-mode/SKILL.md` | Two index lines: the benchmark trigger and the Explain the Number principle, her wording. | The router must know the new skills exist. |
| 4 | `scripts/front-door.py`, `plugins/pstack/.front-door.json`, every `SKILL.md`, `skills/*/agents/openai.yaml` | `front-door.py passive` makes every skill explicit-only (Claude Code: `disable-model-invocation: true`; Codex: `allow_implicit_invocation: false`) and adds a read-by-path note to the router. `front-door.py active` restores the port byte for byte. The release branch ships passive. | Installed skills must not steer running lanes before the front door switches. The safety review (2026-10-04) found the port lets every skill start on its own. |

The other 18 files her v0.15.6 to v0.15.9 changed are NOT taken here. They arrive with the port's own sync (ericlitman/open-pstack issue 128), by deliberate diff.

## The front-door switch (slice 4 of the brief)

1. `python3 scripts/front-door.py active`, commit, push `adam/release`, reinstall on every lane.
2. `touch ~/.agents/pstack-front-door.on`.

To stop: remove the flag file. To go fully passive again: `front-door.py passive`, push, reinstall.
