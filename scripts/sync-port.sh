#!/bin/bash
# Merge a port release into the fork's release branch with the deliberate-diff rule in FORK.md.
#
#   scripts/sync-port.sh <port-tag> <fork-version>        e.g. v1.16.0 1.16.0-adam.20261101
#
# Run on a branch cut from adam/release with the `upstream` remote (ericlitman/open-pstack)
# fetched. The merge's natural base is the last port release the fork merged, so every file
# the fork squash-imported since then conflicts. The script resolves what needs no judgment:
# a file whose fork copy equals the previous port release's copy takes the new release's copy,
# and the rest re-merge three-way against that previous release. It stamps the fork version
# on the manifests and UPSTREAM.md, then lists the conflicts left for a person to read.
set -eu
tag="$1"; version="$2"
[ -z "$(git status --porcelain)" ] || { echo "the checkout has local changes; commit or stash them first"; exit 1; }
prev="$(sed -n 's/^| open-pstack version | `\([0-9.]*\)[^`]*` |$/\1/p' UPSTREAM.md)"
[ -n "$prev" ] || { echo "UPSTREAM.md has no open-pstack version row"; exit 1; }
prev="v$prev"
git rev-parse -q --verify "$tag^{commit}" >/dev/null || { echo "unknown tag $tag; fetch upstream --tags"; exit 1; }
git rev-parse -q --verify "$prev^{commit}" >/dev/null || { echo "unknown previous release $prev"; exit 1; }
ours="$(git rev-parse HEAD)"
log="$(mktemp)"
if ! git merge --no-commit --no-ff "$tag" > "$log" 2>&1 && [ -z "$(git diff --name-only --diff-filter=U)" ]; then
  echo "merge of $tag did not start:"; cat "$log"; rm -f "$log"; exit 1
fi
rm -f "$log"
for f in $(git diff --name-only --diff-filter=U); do
  o=$(git rev-parse -q --verify "$ours:$f" 2>/dev/null || echo none)
  p=$(git rev-parse -q --verify "$prev:$f" 2>/dev/null || echo none)
  t=$(git rev-parse -q --verify "$tag:$f" 2>/dev/null || echo none)
  if [ "$o" = "$p" ] || [ "$o" = "$t" ]; then git checkout --quiet "$tag" -- "$f"; git add -- "$f"; continue; fi
  if [ "$p" = "$t" ]; then git checkout --quiet "$ours" -- "$f"; git add -- "$f"; continue; fi
  tmp=$(mktemp -d)
  git show "$ours:$f" > "$tmp/ours"; git show "$prev:$f" > "$tmp/prev" 2>/dev/null || : > "$tmp/prev"; git show "$tag:$f" > "$tmp/tag"
  if git merge-file -p -L fork -L "$prev" -L "$tag" "$tmp/ours" "$tmp/prev" "$tmp/tag" > "$f"; then git add -- "$f"; fi
  rm -rf "$tmp"
done
for f in .claude-plugin/marketplace.json plugins/pstack/.claude-plugin/plugin.json plugins/pstack/.codex-plugin/plugin.json; do
  git show "$tag:$f" > "$f"
  sed -i '' -E "s/(\"version\": \")[^\"]+(\")/\1$version\2/" "$f"; git add -- "$f"
done
# The port owns its provenance files; the fork records itself in FORK.md and one CHANGES.md section.
for f in NOTICE.md CHANGES.md; do git show "$tag:$f" > "$f"; git add -- "$f"; done
git show "$tag:UPSTREAM.md" > UPSTREAM.md
sed -i '' -E "s/^(\| open-pstack version \| \`)[^\`]+(\` \|)/\1$version\2/" UPSTREAM.md; git add -- UPSTREAM.md
left="$(git diff --name-only --diff-filter=U)"
if [ -z "$left" ]; then echo "merged $tag with no conflicts left; read the diff, then commit"; else
  echo "merged $tag; resolve these by hand, then commit:"; echo "$left"; fi
echo "then: add a CHANGES.md section for $version, update FORK.md's sync record, run bun run static, typecheck, test"
