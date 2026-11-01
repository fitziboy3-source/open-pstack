#!/bin/bash
# Merge a port release into the fork's release branch with the deliberate-diff rule in FORK.md.
#
#   scripts/sync-port.sh <port-tag> <fork-version>        e.g. v1.16.0 1.16.0-adam.20261101
#
# Run on a clean branch cut from adam/release with the `upstream` remote (ericlitman/open-pstack)
# fetched. The merge's natural base is the last port release the fork merged, so every file
# the fork squash-imported since then conflicts. The script resolves what needs no judgment:
# a file whose fork copy equals the previous port release's copy takes the new release's copy,
# and the rest re-merge three-way against that previous release. A file one side deleted, and
# every conflict that survives the three-way merge, stays for a person to read; the fork's
# provenance files (FORK.md, CHANGES.md, NOTICE.md, UPSTREAM.md) merge like any other. It stamps
# the fork version on the manifests and, when it merged cleanly, on UPSTREAM.md's version row.
set -eu
tag="$1"; version="$2"
[ -z "$(git status --porcelain)" ] || { echo "the checkout has local changes; commit or stash them first"; exit 1; }
prev="$(sed -n 's/^| open-pstack version | `\([0-9.]*\)[^`]*` |$/\1/p' UPSTREAM.md)"
[ -n "$prev" ] || { echo "UPSTREAM.md has no open-pstack version row"; exit 1; }
prev="v$prev"
git rev-parse -q --verify "$tag^{commit}" >/dev/null || { echo "unknown tag $tag; fetch upstream --tags"; exit 1; }
git rev-parse -q --verify "$prev^{commit}" >/dev/null || { echo "unknown previous release $prev"; exit 1; }
if git merge-base --is-ancestor "$tag" HEAD; then echo "$tag is already merged into this branch"; exit 1; fi
ours="$(git rev-parse HEAD)"
inplace() { local file="$1"; shift; sed -E "$@" "$file" > "$file.tmp" && mv "$file.tmp" "$file"; }
log="$(mktemp)"
if ! git merge --no-commit --no-ff "$tag" > "$log" 2>&1 && [ -z "$(git diff --name-only --diff-filter=U)" ]; then
  echo "merge of $tag did not start:"; cat "$log"; rm -f "$log"; exit 1
fi
rm -f "$log"
for f in $(git diff --name-only --diff-filter=U); do
  o=$(git rev-parse -q --verify "$ours:$f" 2>/dev/null || echo none)
  p=$(git rev-parse -q --verify "$prev:$f" 2>/dev/null || echo none)
  t=$(git rev-parse -q --verify "$tag:$f" 2>/dev/null || echo none)
  if [ "$o" = none ] || [ "$p" = none ] || [ "$t" = none ]; then continue; fi
  if [ "$o" = "$p" ] || [ "$o" = "$t" ]; then git checkout --quiet "$tag" -- "$f"; git add -- "$f"; continue; fi
  if [ "$p" = "$t" ]; then git checkout --quiet "$ours" -- "$f"; git add -- "$f"; continue; fi
  tmp=$(mktemp -d)
  git show "$ours:$f" > "$tmp/ours"; git show "$prev:$f" > "$tmp/prev"; git show "$tag:$f" > "$tmp/tag"
  if git merge-file -p -L fork -L "$prev" -L "$tag" "$tmp/ours" "$tmp/prev" "$tmp/tag" > "$f"; then git add -- "$f"; fi
  rm -rf "$tmp"
done
for f in .claude-plugin/marketplace.json plugins/pstack/.claude-plugin/plugin.json plugins/pstack/.codex-plugin/plugin.json; do
  git show "$tag:$f" > "$f"
  inplace "$f" "s/(\"version\": \")[^\"]+(\")/\1$version\2/"; git add -- "$f"
done
if ! git diff --name-only --diff-filter=U | grep -qx UPSTREAM.md; then
  inplace UPSTREAM.md "s/^(\| open-pstack version \| \`)[^\`]+(\` \|)/\1$version\2/"; git add -- UPSTREAM.md
fi
left="$(git diff --name-only --diff-filter=U)"
if [ -z "$left" ]; then echo "merged $tag with no conflicts left; read the diff, then commit"; else
  echo "merged $tag; resolve these by hand, then commit:"; echo "$left"; fi
echo "then: add a CHANGES.md section for $version, update FORK.md's sync record, run bun run static, typecheck, test"
