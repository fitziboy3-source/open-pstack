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
| 4 | `scripts/front-door.py`, `plugins/pstack/.front-door.json`, every `SKILL.md`, `skills/*/agents/openai.yaml` | `front-door.py passive` makes every skill explicit-only (Claude Code: `disable-model-invocation: true`; Codex: `allow_implicit_invocation: false`) and adds a read-by-path note to the router. `front-door.py active` restores the port byte for byte. The release branch shipped passive until the front-door switch on 2026-10-05; it is active since (the commit that made it so says so). | Installed skills must not steer running lanes before the front door switches. The safety review (2026-10-04) found the port lets every skill start on its own. |
| 5 | `scripts/cloud-setup.sh`, `tests/cloud-setup-test.sh` | New files. The script installs the kit into a Claude Code cloud session as the personal skills-directory plugin `pstack@skills-dir`. | A cloud session loads no plugin from the Mac or from a repo's settings. See "Cloud sessions" below. |

The other 18 files her v0.15.6 to v0.15.9 changed are NOT taken here. They arrive with the port's own sync (ericlitman/open-pstack issue 128), by deliberate diff.

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
