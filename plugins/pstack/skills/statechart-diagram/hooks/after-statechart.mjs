#!/usr/bin/env node
// after-statechart.mjs — a PostToolUse hook on Bash. When the pstack /statechart runner has just written a
// chart, it tells Claude to draw the plate with the statechart-diagram skill. On every other command it
// says nothing and exits 0. A hook must never break the tool it follows, so every failure is swallowed.
import fs from 'node:fs';
import path from 'node:path';

const chunks = [];
process.stdin.on('data', (d) => chunks.push(d));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return; }
  try { run(input); } catch { /* silent */ }
});

const unquote = (s) => s.replace(/^["']|["']$/g, '');

function run(input) {
  if (input.tool_name !== 'Bash') return;
  const cmd = String(input.tool_input?.command ?? '');
  if (!/statechart/.test(cmd) || /plate\.mjs/.test(cmd)) return;
  const r = input.tool_response;
  const text = typeof r === 'string' ? r : [r?.stdout, r?.output, r?.content, r?.stderr].filter((s) => typeof s === 'string').join('\n');
  const cwd = input.cwd || process.cwd();
  // "cd DIR && …" moves the base that relative paths resolve against
  const cdm = cmd.match(/(?:^|[;&|]\s*)cd\s+("[^"]+"|'[^']+'|\S+)\s*(?:&&|;)/);
  const base = cdm ? path.resolve(cwd, unquote(cdm[1])) : cwd;
  const candidates = [];
  // the runner ends with "Wrote DIR"
  const wrote = text.match(/^Wrote (.+)$/m);
  if (wrote) candidates.push(wrote[1].trim());
  // or read the command itself: <skill dir>/scripts/statechart SPEC.tla [--out DIR]
  const runner = cmd.match(/(\S*statechart(?:\.ts)?)\s+("[^"]+\.tla"|'[^']+\.tla'|\S+\.tla)/);
  if (runner) {
    const spec = unquote(runner[2]), out = cmd.match(/--out[=\s]+("[^"]+"|'[^']+'|\S+)/);
    candidates.push(out ? unquote(out[1]) : spec.replace(/\.tla$/, '-chart'));
  }
  for (const c of candidates) {
    const dir = path.resolve(base, c);
    if (fs.existsSync(path.join(dir, 'chart.mmd'))) return say(dir, fs.existsSync(path.join(dir, 'report.md')));
  }
}

function say(dir, hasReport) {
  const chart = path.join(dir, 'chart.mmd');
  const additionalContext = `The /statechart run just wrote ${chart}${hasReport ? ' and report.md' : ''}. The user wants every finished statechart drawn as a plate as well: first give the statechart hand-off as that skill asks (the chart, each rule, each bug path), then invoke the statechart-diagram skill (Skill tool, skill "statechart-diagram") on ${chart}, choose three to six things from the reader's world for it, and deliver plate-x.jpg with the exact plate command in the same hand-off.`;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext } }));
}
