import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { save, sha256, type Session } from './io.ts';
import type { Harness } from './types.ts';
export interface NativeRouting { router: string; models: Partial<Record<Harness, { model: string; effort: string }>> }
/** Account selection precedes auth linking in the harness-owned native launcher. */
export async function routedSession(routing: NativeRouting, record: Session, input: {
  harness: Harness; home: string; workspace: string; cwd: string; sha: string; prompt: string; stdout: string; stderr: string;
}): Promise<{ exitCode: number; evidence: string[] }> {
  const descriptor = routing.models[input.harness];
  if (!descriptor) throw new Error(`native-model-missing:${input.harness}`);
  const request = `${input.stdout}.request.json`, account = `${request}.account.json`, receipt = `${request}.receipt.json`;
  await save(request, { schema: 1, state: input.home, workspace: input.workspace, cwd: input.cwd, sha: input.sha, prompt: input.prompt });
  const digest = sha256(await readFile(request));
  const args = [routing.router, 'run', '--receipt', account, '--', join(routing.router, '..', 'pstack-verify-run'),
    '--provider', input.harness, '--model', descriptor.model, '--effort', descriptor.effort, '--request', request, '--sha256', digest];
  // Only the trusted launcher receives host admission context. It constructs the candidate environment.
  const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined));
  const exitCode = await record(args, { cwd: input.cwd, env, input: '', stdout: input.stdout, stderr: input.stderr });
  const admitted = JSON.parse(await readFile(account, 'utf8')), completed = JSON.parse(await readFile(receipt, 'utf8'));
  if (admitted.terminal !== true || completed.terminal !== true || completed.auth_link_restored !== true ||
    completed.attempt !== admitted.attempt || completed.identity !== admitted.identity ||
    completed.request_sha256 !== digest || completed.sha !== input.sha || completed.model !== descriptor.model ||
    completed.effort !== descriptor.effort || completed.provider !== input.harness || completed.cwd !== input.cwd ||
    completed.exit_code !== 0 || exitCode !== 0) throw new Error('native-session-not-successfully-completed');
  return { exitCode, evidence: [request, account, receipt] };
}
