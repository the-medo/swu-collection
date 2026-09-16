import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { planDeployments } from './plan.mjs';
import { deploymentMatrix, selectServices } from './services.mjs';
import { triggerDeployment } from './trigger.mjs';

test('service boundaries follow independently deployed build/runtime inputs', () => {
  const examples = [
    [['scripts/remote-dev/sql/001-core-data.sql'], ['maintainer']],
    [['scripts/remote-dev/create-sanitized-db-backup.sh'], ['maintainer']],
    [
      ['scripts/remote-dev/Dockerfile', 'scripts/remote-dev/docker-compose.coolify.yml'],
      ['maintainer'],
    ],
    [['frontend/src/main.tsx', 'frontend/bun.lock'], ['main']],
    [['server/routes/collection.ts', 'Dockerfile'], ['main']],
    [['play/worker/server.ts', 'Dockerfile.crossfire.dockerignore'], ['crossfire']],
    [['play/engine/advance.ts'], ['main', 'crossfire']],
    [
      ['play/cards/release.json', 'play/view/wire.ts'],
      ['main', 'crossfire'],
    ],
    [
      ['server/lib/crossfire/lobbies.ts', 'server/lib/discord/client.ts'],
      ['main', 'crossfire'],
    ],
    [
      ['shared/lib/auth/roles.ts', 'server/db/schema/deck.ts'],
      ['main', 'crossfire'],
    ],
    [
      ['drizzle/0057_crossfire.sql', 'server/db/migrate.ts'],
      ['main', 'crossfire'],
    ],
    [
      ['package.json', 'bun.lock', 'tsconfig.json'],
      ['main', 'crossfire'],
    ],
    [['README.md', 'docs/crossfire/worker.md', 'scripts/worktree-dev/common.sh'], []],
    [['play/testing/fixtures/game.json', 'server/lib/crossfire/lobbies.test.ts'], []],
    [['new-build-input.json'], ['main', 'maintainer', 'crossfire']],
    [
      ['.github/workflows/deploy.yml', 'scripts/deploy/services.mjs'],
      ['main', 'maintainer', 'crossfire'],
    ],
    [['scripts/deploy/deploy.test.mjs'], []],
    [['.junie/config.yaml'], []],
    [
      ['frontend/src/main.tsx', 'scripts/remote-dev/sql/new.sql'],
      ['main', 'maintainer'],
    ],
  ];
  for (const [paths, expected] of examples)
    assert.deepEqual(selectServices(paths), expected, paths.join(', '));
});

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'swubase-deploy-test-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  git('init', '-b', 'main');
  git('config', 'user.email', 'deploy-test@example.invalid');
  git('config', 'user.name', 'Deployment test');
  const write = (path, content = path) => {
    mkdirSync(dirname(join(cwd, path)), { recursive: true });
    writeFileSync(join(cwd, path), content);
  };
  const commit = () => {
    git('add', '.');
    git('-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  write('README.md');
  const before = commit();
  return { cwd, git, write, commit, before };
}

test('a multi-commit push selects all affected services, including unusual filenames', t => {
  const f = fixture(t);
  f.write('frontend/src/new page\nwith-newline.ts');
  f.commit();
  f.write('scripts/remote-dev/sql/new.sql');
  const after = f.commit();
  assert.deepEqual(planDeployments('push', { before: f.before, after }, f.cwd).selected, [
    'main',
    'maintainer',
  ]);
  assert.equal(planDeployments('push', { before: f.before, after }, f.cwd).migrationChanges, false);
});

test('migration inputs require a manual worker handoff; operator selections acknowledge it', t => {
  const f = fixture(t);
  f.write('drizzle/0058_new-schema.sql');
  const after = f.commit();
  const plan = planDeployments('push', { before: f.before, after }, f.cwd);
  assert.deepEqual(plan.selected, ['main', 'crossfire']);
  assert.equal(plan.migrationChanges, true);
  assert.equal(
    planDeployments('workflow_dispatch', {
      inputs: { service: 'crossfire' },
    }).migrationChanges,
    false,
  );
  f.write('drizzle/README.md');
  const docs = f.commit();
  assert.equal(
    planDeployments('push', { before: after, after: docs }, f.cwd).migrationChanges,
    false,
  );
  f.write('server/db/migrate.ts');
  assert.equal(
    planDeployments('push', { before: docs, after: f.commit() }, f.cwd).migrationChanges,
    true,
  );
});

test('moving a file between services and deleting it redeploys both old and new owners', t => {
  const f = fixture(t);
  f.write('frontend/source.ts');
  const before = f.commit();
  mkdirSync(join(f.cwd, 'play/worker'), { recursive: true });
  renameSync(join(f.cwd, 'frontend/source.ts'), join(f.cwd, 'play/worker/source.ts'));
  const after = f.commit();
  assert.deepEqual(planDeployments('push', { before, after }, f.cwd).selected, [
    'main',
    'crossfire',
  ]);
  rmSync(join(f.cwd, 'play/worker/source.ts'));
  assert.deepEqual(planDeployments('push', { before: after, after: f.commit() }, f.cwd).selected, [
    'crossfire',
  ]);
});

test('PR plans use the merge base, excluding unrelated changes already on main', t => {
  const f = fixture(t);
  f.git('checkout', '-b', 'feature');
  f.write('play/worker/config.ts');
  const head = f.commit();
  f.git('checkout', 'main');
  f.write('scripts/remote-dev/sql/new.sql');
  const base = f.commit();
  assert.deepEqual(
    planDeployments(
      'pull_request',
      {
        pull_request: { base: { sha: base }, head: { sha: head } },
      },
      f.cwd,
    ).selected,
    ['crossfire'],
  );
});

test('new branch or unavailable previous commit selects all; invalid target fails', t => {
  const f = fixture(t);
  for (const before of ['0'.repeat(40), 'f'.repeat(40)]) {
    assert.deepEqual(planDeployments('push', { before, after: f.before }, f.cwd).selected, [
      'main',
      'maintainer',
      'crossfire',
    ]);
    assert.equal(
      planDeployments('push', { before, after: f.before }, f.cwd).migrationChanges,
      true,
    );
  }
  assert.throws(
    () => planDeployments('push', { before: f.before, after: '--help' }, f.cwd),
    /target commit/,
  );
  assert.deepEqual(
    planDeployments('push', { before: f.before, after: f.before }, f.cwd).selected,
    [],
  );
});

test('force pushes compare both tips even when the old tip is not an ancestor', t => {
  const f = fixture(t);
  f.write('frontend/removed.ts');
  const before = f.commit();
  f.git('checkout', '-b', 'replacement', f.before);
  f.write('play/worker/config.ts');
  const after = f.commit();
  assert.deepEqual(planDeployments('push', { before, after }, f.cwd).selected, [
    'main',
    'crossfire',
  ]);
});

test('manual selection permits a single service or all, with fixed secret names', () => {
  const plan = planDeployments('workflow_dispatch', { inputs: { service: 'maintainer' } });
  assert.deepEqual(deploymentMatrix(plan.selected), {
    include: [{ service: 'maintainer', webhook_secret: 'COOLIFY_WEBHOOK_MAINTAINER' }],
  });
  assert.equal(
    planDeployments('workflow_dispatch', { inputs: { service: 'all' } }).selected.length,
    3,
  );
  assert.throws(
    () => planDeployments('workflow_dispatch', { inputs: { service: 'postgres' } }),
    /Invalid service/,
  );
  assert.throws(() => planDeployments('schedule', {}), /Unsupported/);
});

const config = {
  service: 'main',
  webhook: 'https://coolify.example.invalid/api/v1/deploy?uuid=app123&force=true',
  token: 'test-token-never-send',
};
const queued = { deployments: [{ resource_uuid: 'app123', deployment_uuid: 'deployment123' }] };

test('webhook requests authenticate, keep the build cache, and reject redirects', async () => {
  let calls = 0;
  const deployment = await triggerDeployment(config, async (url, options) => {
    calls++;
    assert.equal(url.searchParams.get('uuid'), 'app123');
    assert.equal(url.searchParams.get('force'), 'false');
    assert.equal(options.headers.Authorization, 'Bearer test-token-never-send');
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(queued);
  });
  assert.equal(deployment, 'deployment123');
  assert.equal(calls, 1);
});

test('invalid secrets/targets fail before any network request', async () => {
  const request = () => {
    assert.fail('must not contact Coolify');
  };
  for (const patch of [
    { token: '' },
    { webhook: '' },
    { service: 'postgres' },
    { webhook: 'http://coolify.example.invalid/api/v1/deploy?uuid=app123' },
    { webhook: 'https://coolify.example.invalid/api/v1/deploy?tag=all' },
    { webhook: 'https://coolify.example.invalid/api/v1/deploy?uuid=app123,db123' },
    { webhook: 'https://coolify.example.invalid/api/v1/deploy?uuid=app123&uuid=db123' },
    { webhook: 'https://coolify.example.invalid/api/v1/deploy?uuid=app123&pr=1' },
  ])
    await assert.rejects(triggerDeployment({ ...config, ...patch }, request));
});

test('HTTP failures, HTML login pages and HTTP 200 resource denials fail without leaking response data', async () => {
  for (const response of [
    new Response('sensitive error', { status: 401 }),
    new Response('sensitive error', { status: 500 }),
    new Response('<html>sensitive login page</html>'),
    Response.json({ deployments: [{ resource_uuid: 'app123', message: 'sensitive denied' }] }),
    Response.json({
      deployments: [{ resource_uuid: 'other-resource', deployment_uuid: 'wrong123' }],
    }),
  ]) {
    await assert.rejects(
      triggerDeployment(config, async () => response),
      error => {
        assert.doesNotMatch(error.message, /sensitive|test-token|coolify\.example/);
        return true;
      },
    );
  }
});

test('ambiguous timeouts are never automatically retried', async () => {
  let calls = 0;
  await assert.rejects(
    triggerDeployment(config, async () => {
      calls++;
      throw new Error('network failure with sensitive URL');
    }),
    /Check its deployment queue before retrying/,
  );
  assert.equal(calls, 1);
});
