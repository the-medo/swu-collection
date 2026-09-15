import { expect, test } from 'bun:test';
import { advance } from '../engine/advance.ts';
import { encodeState } from '../engine/checkpoint.ts';
import { jtlContinuations } from './jtl-continuations.ts';
for (const c of jtlContinuations())
  test(`${c.name}: suspended instruction resumes in a fresh process`, () => {
    const child = Bun.spawnSync(
      [process.execPath, new URL('./fixtures/resume.ts', import.meta.url).pathname],
      {
        stdin: Buffer.from(JSON.stringify({ state: encodeState(c.state), input: c.input })),
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );
    expect(child.exitCode).toBe(0);
    expect(child.stderr.toString()).toBe('');
    expect(JSON.parse(child.stdout.toString())).toEqual(advance(c.state, c.input));
  });
