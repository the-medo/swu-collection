import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { keepOnlyBundle, retainBundle } from '../host/bundles.ts';

async function command(args: string[], cwd: string): Promise<Buffer> {
  const child = Bun.spawn(args, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [output, error, code] = await Promise.all([
    new Response(child.stdout).arrayBuffer(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code) throw new Error(`${args[0]} failed (${code}): ${error}`);
  return Buffer.from(output);
}

// Reconstruct only committed engine inputs in an isolated temporary directory.
// Dependencies come from that commit's lockfile; lifecycle scripts stay disabled.
export async function archiveRevision(repository: string, ref: string, directory: string) {
  const revision = (
    await command(
      ['git', 'rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`],
      repository,
    )
  )
    .toString()
    .trim();
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Invalid source revision');
  const head = (await command(['git', 'rev-parse', 'HEAD'], repository)).toString().trim();
  if (revision !== head) throw new Error('Pre-release archives only build the current HEAD');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lock = join(directory, '.archive.lock');
  await mkdir(lock).catch(() => {
    throw new Error(
      'Crossfire archive is locked by another build; remove a stale .archive.lock only after its process has stopped',
    );
  });
  try {
    const temporary = await mkdtemp(join(tmpdir(), 'crossfire-build-'));
    try {
      const archive = await command(
        ['git', 'archive', revision, 'play/engine', 'play/cards', 'package.json', 'bun.lock'],
        repository,
      );
      const unpack = Bun.spawn(['tar', '-xf', '-', '-C', temporary], {
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
      });
      unpack.stdin.write(archive);
      unpack.stdin.end();
      const [error, code] = await Promise.all([new Response(unpack.stderr).text(), unpack.exited]);
      if (code) throw new Error(`Cannot unpack engine sources: ${error}`);
      await command(
        [process.execPath, 'install', '--frozen-lockfile', '--ignore-scripts'],
        temporary,
      );
      const built = await Bun.build({
        entrypoints: [join(temporary, 'play/engine/index.ts')],
        target: 'bun',
        format: 'esm',
        splitting: false,
        minify: true,
        sourcemap: 'none',
      });
      if (!built.success || built.outputs.length !== 1)
        throw new Error(`Engine archive build failed: ${built.logs.join('\n')}`);
      if ((await command(['git', 'rev-parse', 'HEAD'], repository)).toString().trim() !== revision)
        throw new Error('HEAD changed during the archive build; retry from the current commit');
      const descriptor = await retainBundle(
        directory,
        new Uint8Array(await built.outputs[0]!.arrayBuffer()),
        revision,
      );
      const removedEngines = await keepOnlyBundle(directory, descriptor.versions);
      return { ...descriptor, removedEngines };
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  } finally {
    await rm(lock, { recursive: true });
  }
}

if (import.meta.main) {
  const repository = resolve(import.meta.dir, '../..');
  const ref = process.argv[2] ?? 'HEAD';
  const directory = process.argv[3] ?? join(repository, '.swubase/crossfire-bundles');
  console.log(JSON.stringify(await archiveRevision(repository, ref, directory), null, 2));
}
