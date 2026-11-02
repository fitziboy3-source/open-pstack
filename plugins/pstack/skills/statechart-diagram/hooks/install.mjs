#!/usr/bin/env node
// install.mjs — wires the after-statechart hook into Claude Code's user settings, for a plain skill install
// (a plugin install ships the hook by itself). Idempotent. `--remove` takes it out again.
//   node <skill dir>/hooks/install.mjs [--settings PATH] [--remove]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), script = path.join(here, 'after-statechart.mjs');
const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const file = opt('--settings') || path.join(configDir, 'settings.json');
const MARK = 'after-statechart.mjs';
const entry = { matcher: 'Bash', hooks: [{ type: 'command', command: `node "${script}"`, timeout: 10, statusMessage: 'Checking whether /statechart wrote a chart' }] };

let settings = {};
if (fs.existsSync(file)) {
  const raw = fs.readFileSync(file, 'utf8');
  try { settings = raw.trim() ? JSON.parse(raw) : {}; } catch (e) { console.error(`${file} is not valid JSON (${e.message}). Fix it first; a broken settings file disables every setting in it.`); process.exit(2); }
  fs.copyFileSync(file, file + '.bak');
}
settings.hooks ??= {}; settings.hooks.PostToolUse ??= [];
const list = settings.hooks.PostToolUse;
const isOurs = (h) => h.hooks?.some((x) => typeof x.command === 'string' && x.command.includes(MARK));
const had = list.some(isOurs);
if (args.includes('--remove')) {
  settings.hooks.PostToolUse = list.filter((h) => !isOurs(h));
  if (!settings.hooks.PostToolUse.length) delete settings.hooks.PostToolUse;
  if (!Object.keys(settings.hooks).length) delete settings.hooks;
  write(); console.log(had ? `Removed the after-statechart hook from ${file}.` : `No after-statechart hook in ${file}; nothing to remove.`);
} else {
  settings.hooks.PostToolUse = list.filter((h) => !isOurs(h)).concat([entry]);
  write(); console.log(`${had ? 'Updated' : 'Added'} the after-statechart hook in ${file}.\nIt runs after every Bash command and speaks only when /statechart has written a chart.mmd.\nA running Claude Code session picks it up after /hooks is opened once, or on restart.`);
}
function write() { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n'); }
