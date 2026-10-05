#!/usr/bin/env bash
# Behaviour test for scripts/cloud-setup.sh: what a cloud environment sees.
# Each case runs the script against a throwaway kit repo and a throwaway
# Claude config directory, then checks the exit code, the last line, and the
# installed files. The fixture is this checkout's real plugins/pstack.
set -uo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
script="$repo/scripts/cloud-setup.sh"
tmp="$(mktemp -d)"
trap 'chmod -R u+w "$tmp" 2>/dev/null; rm -rf "$tmp"' EXIT
fail=0

note() { printf '%s\n' "$*"; }
check() { # check <description> <command...>
  local what="$1"; shift
  if "$@" >/dev/null 2>&1; then note "ok: $what"; else note "FAIL: $what"; fail=1; fi
}

kit="$tmp/kit"
git init --quiet --initial-branch=release "$kit"
mkdir -p "$kit/plugins"
cp -R "$repo/plugins/pstack" "$kit/plugins/pstack"
commit() { git -C "$kit" add -A && git -C "$kit" -c user.name=t -c user.email=t@t commit --quiet -m "$1"; }
commit "kit"

shell_flags=""
run() { # run <claude dir> [VAR=value...] ; sets $out, $code and $last
  local dir="$1"; shift
  out="$(env PSTACK_KIT_REPO="file://$kit" PSTACK_KIT_REF=release PSTACK_CLAUDE_DIR="$dir" "$@" bash $shell_flags "$script" 2>&1)"
  code=$?
  last="$(printf '%s\n' "$out" | tail -n 1)"
}

# A runner may start the script with exit-on-error set. The contract still holds.
shell_flags="-e"
run "$tmp/strict" PSTACK_KIT_REF=no-such-branch
check "a failed first install under bash -e exits 0" test "$code" -eq 0
check "a failed first install under bash -e still ends with the result line" test "${last%this session has no pstack kit}" != "$last"
shell_flags=""

home="$tmp/claude"
dest="$home/skills/pstack"
sha="$(git -C "$kit" rev-parse HEAD)"

run "$home"
check "install exits 0" test "$code" -eq 0
check "install reports the commit it installed" test "${last#pstack-cloud-setup: installed $sha }" != "$last"
check "the plugin manifest lands where Claude Code loads a skills-directory plugin" test -f "$dest/.claude-plugin/plugin.json"
check "every skill is installed" test "$(ls "$dest/skills" | wc -l)" -eq "$(ls "$repo/plugins/pstack/skills" | wc -l)"
check "every agent is installed" test "$(ls "$dest/agents" | wc -l)" -eq "$(ls "$repo/plugins/pstack/agents" | wc -l)"
check "the session hook is installed and executable" test -x "$dest/hooks/session-start"
check "the installed kit records its source commit" grep -qx "sha=$sha" "$dest/.cloud-kit"
check "the kit ships passive, as on the Mac" grep -q '^disable-model-invocation: true$' "$dest/skills/bro/SKILL.md"

git -C "$kit" rm -r --quiet plugins/pstack/skills/bro
mkdir -p "$kit/plugins/pstack/skills/added" && printf -- '---\nname: added\ndescription: x\n---\n' > "$kit/plugins/pstack/skills/added/SKILL.md"
commit "change"
run "$home"
check "a second run exits 0" test "$code" -eq 0
check "a second run installs a skill the branch added" test -f "$dest/skills/added/SKILL.md"
check "a second run removes a skill the branch dropped" test ! -e "$dest/skills/bro"
check "a second run leaves nothing but the kit in the skills directory" test "$(ls -A "$home/skills")" = pstack

installed="$(git -C "$kit" rev-parse HEAD)"
mkdir -p "$dest.new" && : > "$dest.new/not-ours"
run "$home" PSTACK_KIT_REF=no-such-branch
check "an unreachable kit exits 0" test "$code" -eq 0
check "an unreachable kit says SKIPPED on the last line" test "${last#pstack-cloud-setup: SKIPPED}" != "$last"
check "an unreachable kit leaves the installed kit in place" test -f "$dest/skills/added/SKILL.md"
check "an unreachable kit names the kit this session still has" test "${last%kept the kit already installed ($installed)}" != "$last"
check "a failed run deletes no folder it did not create" test -f "$dest.new/not-ours"
run "$home"
check "a later good run still installs beside a folder it does not own" test -f "$dest.new/not-ours" -a "$code" -eq 0 -a "${last#pstack-cloud-setup: installed}" != "$last"

git -C "$kit" rm -r --quiet plugins && : > "$kit/README" && commit "no plugin"
run "$home"
check "a repo without the plugin exits 0" test "$code" -eq 0
check "a repo without the plugin says SKIPPED on the last line" test "${last#pstack-cloud-setup: SKIPPED}" != "$last"
check "a repo without the plugin leaves the installed kit in place" test -f "$dest/skills/added/SKILL.md"

if [ "$(id -u)" -ne 0 ]; then
  git -C "$kit" -c user.name=t -c user.email=t@t revert --no-edit HEAD >/dev/null
  locked="$tmp/locked" && mkdir -p "$locked" && chmod a-w "$locked"
  run "$locked/claude"
  check "an unwritable config directory exits 0" test "$code" -eq 0
  check "an unwritable config directory says SKIPPED on the last line" test "${last#pstack-cloud-setup: SKIPPED}" != "$last"
  check "a failed first install says the session has no kit" test "${last%this session has no pstack kit}" != "$last"
fi

[ "$fail" -eq 0 ] && note "cloud-setup: all checks passed"
exit "$fail"
