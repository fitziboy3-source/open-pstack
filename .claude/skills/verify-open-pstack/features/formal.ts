import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sha256 } from '../scripts/io.ts';
import type { Case, Fixture } from './recipes.ts';
import type { SessionRecord } from '../scripts/types.ts';

const ATOMIC = 'export async function reserve(state) {\n  if (state.used >= state.limit) return false;\n  state.used++;\n  return true;\n}\n';
const SPLIT = 'export async function reserve(state) {\n  const allowed = state.used < state.limit;\n  await Promise.resolve();\n  if (!allowed) return false;\n  state.used++;\n  return true;\n}\n';
// The checker exhausts all schedules of two one-shot clients at capacity one.
export const CHECKER = `import { readFileSync } from 'node:fs';
const model = JSON.parse(readFileSync('verification/model.json', 'utf8'));
if (model.clients !== 2 || model.limit !== 1 || typeof model.splitReservation !== 'boolean') throw new Error('unsupported bounds');
const queue = [{ used:0, pc:[0,0], allowed:[false,false], trace:[] }], seen = new Set();
while(queue.length) {
  const s = queue.shift();
  const key = JSON.stringify([s.used,s.pc,s.allowed]);
  if(seen.has(key)) continue; seen.add(key);
  if(s.used > model.limit) { console.log(JSON.stringify({verdict:'bug',states:seen.size,counterexample:s.trace,used:s.used})); process.exit(1); }
  for(let i=0;i<model.clients;i++) {
    if(s.pc[i] === 2) continue;
    const n = structuredClone(s);
    if(!model.splitReservation) {
      if(n.used < model.limit) n.used++;
      n.pc[i]=2; n.trace.push('client '+i+' atomically checks and reserves');
    } else if(n.pc[i] === 0) {
      n.allowed[i]=n.used < model.limit; n.pc[i]=1;
      n.trace.push('client '+i+' checks available capacity');
    } else {
      if(n.allowed[i]) n.used++;
      n.pc[i]=2; n.trace.push('client '+i+' commits its earlier decision');
    }
    queue.push(n);
  }
}
console.log(JSON.stringify({verdict:'pass',states:seen.size,clients:model.clients,limit:model.limit}));
`;
const REPLAY = "import { reserve } from './capacity.mjs';\nconst state={used:0,limit:1};\nawait Promise.all([reserve(state),reserve(state)]);\nconsole.log(JSON.stringify(state));\nif(state.used>state.limit) process.exit(1);\n";

async function put(f: Fixture, path: string, text: string): Promise<void> {
  await mkdir(join(f.dir, path, '..'), { recursive:true });
  await writeFile(join(f.dir,path),text);
}
async function git(f: Fixture,...args:string[]):Promise<string> {
  return f.run(['git','-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false',...args],{cwd:f.dir});
}
async function commit(f:Fixture, message:string, paths:string[]):Promise<string> {
  await git(f,'add','--',...paths); await git(f,'commit','-qm',message); return (await git(f,'rev-parse','HEAD')).trim();
}
function request(f:Fixture, skill:string, task:string):string {
  const invoke=f.harness==='claude'?`/pstack:${skill}`:`$pstack:${skill}`;
  return `${invoke} ${task} Work only in ${f.dir}. This is one local verification exercise. Do not launch other model sessions or subagents, contact GitHub, or change product code. Use native ${f.harness==='claude'?'Write/Edit':'file-editing tools'} to create or update the project SKILL.md; if permission is denied, report the denial and stop that edit. Write your report to result.md and complete all work before your final reply.`;
}
function loaded(record:SessionRecord,skill:string):void {
  if(!record.skills.includes(`pstack:${skill}`)) throw new Error(`skill-not-loaded:${skill}`);
}
function observed(record:SessionRecord, verdict:string):boolean {
  return record.tools.some(t=>!t.parent && JSON.stringify(t.input).includes('verification/check.mjs') && t.result?.includes(`"verdict":"${verdict}"`));
}

export function maintainFormal():Case {
  return {
    id:'stale-model',
    async prepare(f) {
      await git(f,'init','-q','-b','main');
      await put(f,'capacity.mjs',ATOMIC);await put(f,'replay.mjs',REPLAY);
      const sync=await commit(f,'Reserve capacity atomically',['capacity.mjs','replay.mjs']);
      await put(f,'verification/check.mjs',CHECKER);
      await put(f,'verification/model.json',JSON.stringify({clients:2,limit:1,splitReservation:false})+'\n');
      await put(f,'.claude/skills/verify-capacity/SKILL.md',`---\nname: verify-capacity\ndescription: Model-check reserve capacity after changes to capacity.mjs.\n---\n# Verify capacity\n\nProperty: used never exceeds limit. Oversubscription assigns a slot twice.\nCoverage: capacity.mjs reserve, all writes to state.used.\nSync commit: ${sync}\nRun \`bun verification/check.mjs\`. The model describes one atomic check-and-increment when splitReservation is false, and separate check and commit steps when true. The interpreter explores every schedule of two one-shot clients at capacity one, with no releases or crashes. Model state corresponds to used, the allowed decision, and reserve's position before or after its await.\nCompare covered code with the sync commit before trusting a pass. Update the model from the code, keep the capacity property and bounds, then rerun. Replay any failing schedule with \`bun replay.mjs\`. Report a real bug without editing product code. Advance sync only after checking the model against the current commit.\n`);
      await commit(f,'Record bounded capacity verification',['verification/check.mjs','verification/model.json','.claude/skills/verify-capacity/SKILL.md']);
      await put(f,'capacity.mjs',SPLIT);
      const head=await commit(f,'Yield during capacity reservation',['capacity.mjs']);
      await writeFile(`${f.dir}.formal-baseline.json`,JSON.stringify({head,product:sha256(SPLIT),checker:sha256(CHECKER)}));
    },
    prompt:f=>request(f,'maintain-formal-verification-skill','Maintain .claude/skills/verify-capacity/SKILL.md. A change to reserve landed after its sync commit. The existing checker is an exhaustive bounded-state interpreter; keep verification/check.mjs and its two-client, capacity-one bounds unchanged. Update the model from the current code, run the check before and after, replay any counterexample with bun replay.mjs, and report whether the old pass was stale and whether the current code has a bug.'),
    async assert(record,f) {
      loaded(record,'maintain-formal-verification-skill');
      const baseline=JSON.parse(await readFile(`${f.dir}.formal-baseline.json`,'utf8'));
      if(sha256(await readFile(join(f.dir,'capacity.mjs'))) !== baseline.product) throw new Error('formal-product-changed');
      if(sha256(await readFile(join(f.dir,'verification/check.mjs'))) !== baseline.checker) throw new Error('formal-checker-weakened');
      const model=JSON.parse(await readFile(join(f.dir,'verification/model.json'),'utf8'));
      if(!Bun.deepEquals(model,{clients:2,limit:1,splitReservation:true})) throw new Error('formal-model-still-stale-or-bounds-changed');
      if(!observed(record,'pass') || !observed(record,'bug')) throw new Error('formal-before-after-not-observed');
      const replay=record.tools.some(t=>JSON.stringify(t.input).includes('replay.mjs') && t.result?.includes('"used":2'));
      if(!replay) throw new Error('formal-counterexample-not-replayed');
      const skill=await readFile(join(f.dir,'.claude/skills/verify-capacity/SKILL.md'),'utf8');
      if(!skill.includes(baseline.head)) throw new Error('formal-sync-commit-not-updated');
      const result=await readFile(join(f.dir,'result.md'),'utf8');
      if(!/bug|oversubscri/i.test(result) || !/stale|drift/i.test(result)) throw new Error('formal-finding-not-reported');
      // The captain independently runs the unmodified checker on the maintained model.
      const output=await f.run(['bun','-e',"const p=Bun.spawnSync(['bun','verification/check.mjs']);process.stdout.write(p.stdout);if(p.exitCode!==1)process.exit(2)"],{cwd:f.dir});
      if(!output.includes('"verdict":"bug"')) throw new Error('formal-counterexample-missing');
      return {assertions:['skill-loaded','stale-pass-observed','model-updated','bounds-preserved','counterexample-replayed','product-unchanged','sync-updated'],files:['result.md','verification/model.json','.claude/skills/verify-capacity/SKILL.md'].map(p=>join(f.dir,p))};
    },
  };
}

export function createFormal():Case {
  return {
    id:'create-and-mutate',
    async prepare(f) {
      await git(f,'init','-q','-b','main');
      await put(f,'capacity.mjs',ATOMIC);await put(f,'replay.mjs',REPLAY);
      await put(f,'verification/check.mjs',CHECKER);
      await put(f,'verification/model.json',JSON.stringify({clients:2,limit:1,splitReservation:false})+'\n');
      await put(f,'README.md','# Capacity reservation\n\nPromise: used never exceeds limit. Each reserve caller can acquire at most one slot. The bundled dependency-free bounded model checker enumerates every schedule of two one-shot callers at capacity one. Its splitReservation switch must match whether capacity.mjs checks and increments atomically or yields between the check and increment. The checker is available infrastructure; this repository has no project verification skill.\n');
      const head=await commit(f,'Atomic capacity module and bounded verification tool',['capacity.mjs','replay.mjs','verification/check.mjs','verification/model.json','README.md']);
      await writeFile(`${f.dir}.formal-baseline.json`,JSON.stringify({head,product:sha256(ATOMIC),checker:sha256(CHECKER)}));
    },
    prompt:f=>request(f,'create-formal-verification-skill',`Create .claude/skills/verify-capacity/SKILL.md for reserve's capacity invariant. Use the bundled exhaustive bounded model checker (bun verification/check.mjs); keep its interpreter and two-client, capacity-one scope unchanged. Confirm the model matches capacity.mjs. The only authorized product edit is the skill's disposable mutation test: split reserve's check and increment with an await, reflect that split in the model, observe the failure and replay it, then restore both code and model. Record the checked commit, coverage, assumptions, bounds, command and how to distinguish model drift from a bug. Follow the generated skill and report the evidence. The scratch mutation is explicitly permitted by this fixture.`).replace('or change product code.', 'or change product code except for the explicitly permitted scratch mutation.'),
    async assert(record,f) {
      loaded(record,'create-formal-verification-skill');
      const baseline=JSON.parse(await readFile(`${f.dir}.formal-baseline.json`,'utf8'));
      if(sha256(await readFile(join(f.dir,'capacity.mjs'))) !== baseline.product) throw new Error('formal-mutation-not-restored');
      if(sha256(await readFile(join(f.dir,'verification/check.mjs'))) !== baseline.checker) throw new Error('formal-checker-weakened');
      const model=JSON.parse(await readFile(join(f.dir,'verification/model.json'),'utf8'));
      if(!Bun.deepEquals(model,{clients:2,limit:1,splitReservation:false})) throw new Error('formal-model-not-restored');
      if(!observed(record,'pass') || !observed(record,'bug')) throw new Error('formal-mutation-not-observed');
      if(!record.tools.some(t=>JSON.stringify(t.input).includes('replay.mjs') && t.result?.includes('"used":2'))) throw new Error('formal-mutation-not-replayed');
      const path=join(f.dir,'.claude/skills/verify-capacity/SKILL.md'), skill=await readFile(path,'utf8');
      if(!/^---\n[\s\S]*name:\s*verify-capacity[\s\S]*description:/m.test(skill) || !skill.includes(baseline.head) || !skill.includes('capacity.mjs') || !skill.includes('verification/check.mjs') || !/bound|two|2/i.test(skill)) throw new Error('formal-skill-contract-incomplete');
      const output=await f.run(['bun','verification/check.mjs'],{cwd:f.dir});
      if(!output.includes('"verdict":"pass"')) throw new Error('formal-final-check-failed');
      return {assertions:['skill-loaded','project-skill-created','coverage-and-sync-recorded','mutation-caught','mutation-replayed','code-and-model-restored','bounded-check-passes'],files:[path,join(f.dir,'result.md'),join(f.dir,'verification/model.json')]};
    },
  };
}
