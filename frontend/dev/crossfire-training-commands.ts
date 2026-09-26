import { spawn } from 'node:child_process';
import path from 'node:path';

/** Fixed executables/arguments only. Cookies go over stdin and are never logged. */
export function trainingCommand(
  root: string,
  kind: 'inspect' | 'add',
  input: unknown,
): Promise<Record<string, unknown>> {
  const args =
    kind === 'inspect'
      ? [
          'bun',
          '--env-file=.env',
          '--env-file=.env.worktree',
          'server/lib/crossfire-training/inspectDeck.ts',
        ]
      : [
          path.join(root, '.swubase/crossfire-ai/venv/bin/python'),
          'play/ai/training/add_deck.py',
          '--cpus',
          '9',
        ];
  return new Promise((resolve, reject) => {
    const child = spawn('taskset', ['-c', '0-8', ...args], {
      cwd: root,
      detached: true,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    let output = '';
    let failed = false;
    const fail = () => {
      if (failed) return;
      failed = true;
      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch {
          /* Already exited. */
        }
        setTimeout(() => {
          try {
            process.kill(-child.pid!, 'SIGKILL');
          } catch {
            /* Already exited. */
          }
        }, 5000).unref();
      }
      reject(
        new Error(
          'Training preparation could not complete. Check the local training environment and try again.',
        ),
      );
    };
    // Preparation is bounded; this is not a limit on continuous training.
    const timeout = setTimeout(fail, kind === 'inspect' ? 30000 : 120000);
    child.on('error', fail);
    child.stdin.on('error', fail);
    child.stdout.on('data', chunk => {
      output += chunk;
      if (Buffer.byteLength(output) > 2 * 1024 * 1024) fail();
    });
    child.on('close', () => {
      clearTimeout(timeout);
      if (failed) return;
      try {
        const result = JSON.parse(output);
        if (typeof result.ok !== 'boolean') throw new Error();
        resolve(result);
      } catch {
        fail();
      }
    });
    child.stdin.end(JSON.stringify(input));
  });
}
