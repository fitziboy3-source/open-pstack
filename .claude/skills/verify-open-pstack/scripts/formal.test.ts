import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { command } from './io.ts';
import { createFormal, maintainFormal } from '../features/formal.ts';
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
