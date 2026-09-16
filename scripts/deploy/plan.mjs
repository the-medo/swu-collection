import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { deploymentMatrix, selectServices, services } from './services.mjs';

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function commitAvailable(sha, cwd) {
  if (!/^[a-f0-9]{40}$/.test(sha ?? '') || /^0+$/.test(sha)) return false;
  try {
    git(['cat-file', '-e', `${sha}^{commit}`], cwd);
    return true;
  } catch {
    return false;
  }
}

export function planDeployments(eventName, event, cwd = process.cwd()) {
  if (eventName === 'workflow_dispatch') {
    const service = event.inputs?.service;
    if (service !== 'all' && !services.includes(service))
      throw new Error('Invalid service selection');
    return {
      selected: service === 'all' ? services : [service],
      migrationChanges: false,
      reason: 'Manual selection; Coolify deploys its configured main branch.',
    };
  }
  if (!['push', 'pull_request'].includes(eventName))
    throw new Error('Unsupported deployment event');
  const before = eventName === 'push' ? event.before : event.pull_request?.base.sha;
  const after = eventName === 'push' ? event.after : event.pull_request?.head.sha;
  if (!commitAvailable(after, cwd)) throw new Error('Cannot read the target commit');
  if (!commitAvailable(before, cwd)) {
    return {
      selected: services,
      migrationChanges: true,
      reason: 'Previous commit unavailable; conservatively select all services.',
    };
  }
  let base = before;
  if (eventName === 'pull_request') base = git(['merge-base', before, after], cwd).trim();
  // Compare the entire push, not HEAD^ or the (possibly truncated) webhook file
  // list. --no-renames includes both old and new names when crossing services.
  const paths = git(['diff', '--name-only', '--no-renames', '-z', base, after, '--'], cwd)
    .split('\0')
    .filter(Boolean);
  return {
    selected: selectServices(paths),
    migrationChanges: paths.some(
      path =>
        (path.startsWith('drizzle/') && !path.endsWith('.md')) ||
        ['migrate.ts', 'server/db/migrate.ts'].includes(path),
    ),
    reason: `${paths.length} changed path(s), comparing ${base.slice(0, 12)} to ${after.slice(0, 12)}.`,
  };
}

function main() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const plan = planDeployments(process.env.GITHUB_EVENT_NAME, event);
  const output =
    `matrix=${JSON.stringify(deploymentMatrix(plan.selected))}\n` +
    `has_changes=${plan.selected.length > 0}\n` +
    `migration_changes=${plan.migrationChanges}\n`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
  const summary =
    `## Coolify deployment plan\n\n${plan.reason}\n\n` +
    services
      .map(service => `- ${service}: ${plan.selected.includes(service) ? 'selected' : 'unchanged'}`)
      .join('\n') +
    (plan.migrationChanges
      ? '\n\n**Action required: automatic Crossfire deployment is held.** Migration inputs changed ' +
        '(or the previous revision is unavailable). The main app can deploy automatically. ' +
        'Pause further production pushes, verify its Migration complete and Server running logs, ' +
        'then manually run this workflow for crossfire. Its automatic job fails explicitly until ' +
        'this handoff is performed; rerunning the same push does not bypass the hold.\n'
      : '') +
    '\n\nPull requests and manual dry runs never call Coolify. Automatic push deployments ' +
    `are ${process.env.AUTO_DEPLOY_ENABLED === 'true' ? 'enabled' : 'disabled (set COOLIFY_DEPLOY_ENABLED=true to enable)'}.\n` +
    'A successful deployment job means Coolify accepted the request; check Coolify for build and runtime status.\n';
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
