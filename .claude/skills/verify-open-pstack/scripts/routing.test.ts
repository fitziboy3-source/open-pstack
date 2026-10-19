import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from './cli.ts';
import { routedSession } from './routing.ts';
import type { Session } from './io.ts';
const roots:string[]=[];
afterEach(async()=>{for(const root of roots.splice(0)) await rm(root,{recursive:true,force:true});});
test('router requires explicit native models without silent defaults',()=>{
  expect(()=>parse(['run','--pr','2','--output','/proof','--account-router','/router'])).toThrow('required together');
  expect(()=>parse(['run','--pr','2','--output','/proof','--native-model','claude:opus@high'])).toThrow('required together');
  const p=parse(['run','--pr','2','--output','/proof','--account-router','/router','--native-model','claude:opus@high']);
  expect(p.mode==='run' && p.routing?.models.claude?.model).toBe('opus');
});
test('native proof rejects an incomplete admission receipt',async()=>{
  const root=await mkdtemp(join(tmpdir(),'routed-proof-'));roots.push(root);
  for(const terminal of [true,false]) {
    const stdout=join(root,`${terminal}.jsonl`);
    const run:Session=async(args,options)=>{
      expect(args[0]).toBe('/trusted/account-router');expect(args).toContain('/trusted/pstack-verify-run');
      expect(args).toContain('gpt-6-astra');expect(args).not.toContain('--sandbox');expect(options.input).toBe('');
      const req=args[args.indexOf('--request')+1]!,data=JSON.parse(await readFile(req,'utf8'));
      expect(data.prompt).toBe('fixture prompt');
      await writeFile(`${req}.account.json`,JSON.stringify({terminal,attempt:'a',identity:'selected'}));
      await writeFile(`${req}.receipt.json`,JSON.stringify({terminal:true,auth_link_restored:true,attempt:'a',identity:'selected',request_sha256:args.at(-1),sha:data.sha,model:'gpt-6-astra',effort:'xhigh',provider:'codex',cwd:data.cwd,exit_code:0}));
      return 0;
    };
    const proof=routedSession({router:'/trusted/account-router',models:{codex:{model:'gpt-6-astra',effort:'xhigh'}}},run,{harness:'codex',home:root,workspace:root,cwd:root,sha:'a'.repeat(40),prompt:'fixture prompt',stdout,stderr:`${stdout}.err`});
    if(terminal) expect((await proof).evidence).toHaveLength(3);else await expect(proof).rejects.toThrow('not-successfully-completed');
  }
});
