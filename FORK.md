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

The other 18 files her v0.15.6 to v0.15.9 changed are NOT taken here. They arrive with the port's own sync (ericlitman/open-pstack issue 128), by deliberate diff.
