#!/usr/bin/env bash
# Install the pstack kit into a Claude Code cloud session (fork tool, see FORK.md).
#
# Paste this whole file into a cloud environment's "Setup script" field. The
# environment runs it as root before Claude Code launches. It copies
# plugins/pstack from this fork into the personal skills directory, where
# Claude Code loads it as the plugin `pstack@skills-dir`. A cloud session then
# has the same `pstack:<name>` skills, agents, and session hook as a Mac lane,
# from the same branch, with no copy in any product repo.
#
# Contract:
#   - Always exits 0. A non-zero setup script stops the session from starting,
#     and a session without the kit is better than no session.
#   - The last line printed starts with "pstack-cloud-setup:" and says what
#     happened: "installed <sha> ... at <path>", or "SKIPPED" with the reason.
#   - Safe to run again: each run replaces the installed kit with the branch tip.
#   - Holds no secret. The fork is public; anyone who can use the environment
#     can read its setup script.
#
# The environment caches the result and reruns this script when its text
# changes, or after about seven days. To pull a new kit now, change this date
# in the pasted copy: 2026-10-04
#
# Overrides, for tests and for pinning a commit:
#   PSTACK_KIT_REPO    git URL of the kit            (default: this fork on GitHub)
#   PSTACK_KIT_REF     branch or tag to install      (default: adam/release)
#   PSTACK_CLAUDE_DIR  Claude Code config directory  (default: $CLAUDE_CONFIG_DIR, else ~/.claude)

set -uo pipefail

repo="${PSTACK_KIT_REPO:-https://github.com/fitziboy3-source/open-pstack.git}"
ref="${PSTACK_KIT_REF:-adam/release}"
# `cd ~` resolves the home directory from the user database when HOME is unset.
claude_dir="${PSTACK_CLAUDE_DIR:-${CLAUDE_CONFIG_DIR:-$(cd ~ && pwd)/.claude}}"
dest="$claude_dir/skills/pstack"
work=""

finish() {
  rm -rf "$work" "$dest.new"
  echo "pstack-cloud-setup: $1"
  exit 0
}
skip() { finish "SKIPPED, $1; this session has no pstack kit"; }

work="$(mktemp -d)" || skip "no temporary directory"

# The clone is the only network step. Two minutes is far above a healthy clone
# (seconds) and leaves room inside the five minutes a cached environment allows.
timeout 120 git clone --quiet --depth 1 --branch "$ref" "$repo" "$work/kit" \
  || skip "could not clone $repo at $ref"

src="$work/kit/plugins/pstack"
[ -f "$src/.claude-plugin/plugin.json" ] && [ -d "$src/skills" ] \
  || skip "$repo at $ref holds no plugins/pstack plugin"

sha="$(git -C "$work/kit" rev-parse HEAD)"
mkdir -p "$claude_dir/skills" && rm -rf "$dest.new" && cp -R "$src" "$dest.new" \
  && printf '%s\n' "repo=$repo" "ref=$ref" "sha=$sha" > "$dest.new/.cloud-kit" \
  && rm -rf "$dest" && mv "$dest.new" "$dest" \
  || skip "could not write $dest"

finish "installed $sha ($ref) at $dest: $(find "$dest/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ') skills, $(find "$dest/agents" -name '*.md' | wc -l | tr -d ' ') agents"
