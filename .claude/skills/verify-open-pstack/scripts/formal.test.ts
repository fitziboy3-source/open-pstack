import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { command } from './io.ts';
import { createFormal, maintainFormal, namesCommit, syncCommit } from '../features/formal.ts';
import type { Fixture } from '../features/recipes.ts';
import type { SessionRecord } from './types.ts';
const roots:string[]=[];
afterEach(async()=>{for(const root of roots.splice(0)) await rm(root,{recursive:true,force:true});});
async function fixture():Promise<Fixture> {
  const dir=await mkdtemp(join(tmpdir(),'formal-proof-'));roots.push(dir);
  return {dir,harness:'codex',workspace:dir,location:dir,configHome:dir,run:command};
}
function record(skill:string):SessionRecord { return {harness:'codex',exitCode:0,started:Date.now(),skills:[`pstack:${skill}`],commands:[],tools:[],context:[]}; }
test('maintenance exposes a real bug while the stale model passes; no-op maintenance fails',async()=>{
  const f=await fixture(),c=maintainFormal();await c.prepare!(f);
  expect(await command(['bun','verification/check.mjs'],{cwd:f.dir})).toContain('"verdict":"pass"');
  await expect(command(['bun','replay.mjs'],{cwd:f.dir})).rejects.toThrow();
  await expect(c.assert(record('maintain-formal-verification-skill'),f)).rejects.toThrow('still-stale');
  await writeFile(join(f.dir,'verification/model.json'),JSON.stringify({clients:2,limit:1,splitReservation:true}));
  await expect(command(['bun','verification/check.mjs'],{cwd:f.dir})).rejects.toThrow();
  await expect(c.assert(record('maintain-formal-verification-skill'),f)).rejects.toThrow('before-after-not-observed');
  await writeFile(join(f.dir,'capacity.mjs'),'export async function reserve() {}');
  await expect(c.assert(record('maintain-formal-verification-skill'),f)).rejects.toThrow('product-changed');
});
test('creation begins with passing code but requires mutation evidence',async()=>{
  const f=await fixture(),c=createFormal();await c.prepare!(f);
  expect(await command(['bun','replay.mjs'],{cwd:f.dir})).toContain('"used":1');
  expect(await command(['bun','verification/check.mjs'],{cwd:f.dir})).toContain('"verdict":"pass"');
  await expect(c.assert(record('create-formal-verification-skill'),f)).rejects.toThrow('mutation-not-observed');
});
test('the sync record is the Sync commit line, compared whole; ambiguity and prose count as none',()=>{
  const head='efb41f2f3838c0902016a9a97bf7e101d4b36e97', old='761782b83ad658da668937afdf9281ef2e45af56';
  expect(syncCommit('| Sync commit | `efb41f2` |')).toBe('efb41f2');
  expect(syncCommit(`Sync commit: ${head}`)).toBe(head);
  expect(syncCommit(`- **Sync commit**: ${head}`)).toBe(head);
  expect(syncCommit(`Sync commit: ${head.slice(0,7)}\n\n| Sync commit | ${head} |`)).toBe(head);
  expect(syncCommit(`Previous sync commit: ${old}\n\nSync commit: ${head}`)).toBe(head);
  expect(syncCommit(`Last confirmed code/model sync commit: ${head}`)).toBeUndefined();
  expect(syncCommit(`Compare with git diff ${head}..HEAD`)).toBeUndefined();
  expect(syncCommit(`Sync commit: pending\n\nRun git diff ${head}..HEAD`)).toBeUndefined();
  expect(syncCommit(`Update the sync commit after checking ${head}.`)).toBeUndefined();
  expect(syncCommit(`Sync commit candidate: ${head}`)).toBeUndefined();
  expect(syncCommit(`Sync commit has not been updated; counterexample reproduced at: ${head}`)).toBeUndefined();
  expect(syncCommit(`Sync commit: ${old}\n\nSync commit: ${head}`)).toBeUndefined();
  expect(namesCommit('| Sync commit | `efb41f20` |',head)).toBe(false);
  expect(namesCommit('| Sync commit | `0000000` |',head)).toBe(false);
  expect(namesCommit(`Sync commit: ${head.slice(0,7)}\n\nHistory: the stale model previously described ${old}.`,head)).toBe(true);
  expect(namesCommit(`Sync commit: ${old}\n\nCounterexample reproduced on HEAD ${head.slice(0,7)}.`,head)).toBe(false);
});
test('maintenance proves the sync moved by the skill\'s own record, whatever else it mentions',async()=>{
  const f=await fixture(),c=maintainFormal();await c.prepare!(f);
  const path=join(f.dir,'.claude/skills/verify-capacity/SKILL.md');
  const stale=/Sync commit: ([0-9a-f]{40})/.exec(await readFile(path,'utf8'))![1]!;
  const baseline=JSON.parse(await readFile(`${f.dir}.formal-baseline.json`,'utf8'));
  await writeFile(join(f.dir,'verification/model.json'),JSON.stringify({clients:2,limit:1,splitReservation:true}));
  await writeFile(join(f.dir,'result.md'),'A real bug: the stale model passed while the split reserve oversubscribes.');
  const tool=(command:string,result:string)=>({name:'Bash',id:command,input:{command},parent:null,result,failed:false});
  const done={...record('maintain-formal-verification-skill'),tools:[tool('bun verification/check.mjs','{"verdict":"pass"}'),tool('bun verification/check.mjs','{"verdict":"bug"}'),tool('bun replay.mjs','{"used":2,"limit":1}')]};
  const skill=(body:string)=>writeFile(path,`---\nname: verify-capacity\ndescription: x\n---\n${body}\n`);
  await skill(`Sync commit: ${stale}\n\nCounterexample reproduced on HEAD ${baseline.head.slice(0,7)}.`);
  await expect(c.assert(done,f)).rejects.toThrow('sync-commit-not-updated');
  await skill(`Sync commit: pending\n\nRun git diff ${baseline.head}..HEAD -- capacity.mjs`);
  await expect(c.assert(done,f)).rejects.toThrow('sync-commit-not-updated');
  await skill(`Sync commit: ${baseline.head.slice(0,7)}\n\nHistory: the stale model previously described ${stale}.`);
  await expect(c.assert(done,f)).resolves.toBeDefined();
});
