#!/bin/bash
# Exercise scripts/sync-port.sh on a throwaway history: a fork branch and a port release tag.
set -u
repo="$(cd "$(dirname "$0")/.." && pwd)"; script="$repo/scripts/sync-port.sh"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
fail=0
check() { local name="$1"; shift; if "$@" >/dev/null 2>&1; then echo "ok: $name"; else echo "FAIL: $name"; fail=1; fi; }
g() { git -C "$tmp/r" "$@"; }
manifests() { for m in .claude-plugin/marketplace.json plugins/pstack/.claude-plugin/plugin.json plugins/pstack/.codex-plugin/plugin.json; do printf '{\n  "name": "pstack",\n  "version": "%s"\n}\n' "$1" > "$tmp/r/$m"; done; }
mkdir -p "$tmp/r/.claude-plugin" "$tmp/r/plugins/pstack/.claude-plugin" "$tmp/r/plugins/pstack/.codex-plugin"
g init -q -b port && g config user.name fixture && g config user.email fixture@example.invalid && g config commit.gpgsign false
manifests 1.0.0; printf '| open-pstack version | `1.0.0` |\n' > "$tmp/r/UPSTREAM.md"; echo base > "$tmp/r/shared.md"; echo base > "$tmp/r/gone.md"; echo base > "$tmp/r/port-only.md"
g add -A && g commit -qm base && g tag v1.0.0
g checkout -qb fork
echo fork > "$tmp/r/fork-only.md"; echo "fork change" >> "$tmp/r/shared.md"; echo "fork edit" >> "$tmp/r/gone.md"; printf '| open-pstack version | `1.0.0-fork` |\n' > "$tmp/r/UPSTREAM.md"
g add -A && g commit -qm fork
g checkout -q port
manifests 1.1.0; printf '| open-pstack version | `1.1.0` |\n' > "$tmp/r/UPSTREAM.md"; echo "port change" >> "$tmp/r/shared.md"; echo "port change" >> "$tmp/r/port-only.md"; g rm -q gone.md
g add -A && g commit -qm port && g tag v1.1.0
g checkout -q fork

echo x >> "$tmp/r/fork-only.md"
check "a dirty checkout is refused" bash -c "cd '$tmp/r' && ! bash '$script' v1.1.0 1.1.0-fork"
g checkout -q -- fork-only.md
check "an already merged tag is refused" bash -c "cd '$tmp/r' && ! bash '$script' v1.0.0 1.0.0-fork"
check "nothing was staged by a refused run" test -z "$(g diff --cached --name-only)"

(cd "$tmp/r" && bash "$script" v1.1.0 1.1.0-fork > "$tmp/out" 2>&1)
check "the sync lists the content conflict it left" grep -qx shared.md "$tmp/out"
check "a file one side deleted is left for a person" grep -qx gone.md "$tmp/out"
check "a conflicted provenance file is left for a person" grep -qx UPSTREAM.md "$tmp/out"
check "the port's clean change is taken" grep -q "port change" "$tmp/r/port-only.md"
check "the fork's own file survives" grep -qx fork "$tmp/r/fork-only.md"
check "the manifests carry the fork version" grep -q '"1.1.0-fork"' "$tmp/r/plugins/pstack/.codex-plugin/plugin.json"
check "a conflicted UPSTREAM.md is not stamped" grep -q '^<<<<<<<' "$tmp/r/UPSTREAM.md"
[ "$fail" -eq 0 ] && echo "sync-port: all checks passed"
exit "$fail"
