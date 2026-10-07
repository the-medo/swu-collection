import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { crossfireApprovalStatus, crossfireMigrationEnvironment } from './approval.mjs';
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

export function deploymentJobs(plan, eventName) {
  const crossfireApprovalRequired =
    eventName === 'push' && plan.migrationChanges && plan.selected.includes('crossfire');
  const automatic = plan.selected.filter(
    service => !(crossfireApprovalRequired && service === 'crossfire'),
  );
  return {
    matrix: deploymentMatrix(automatic),
    hasChanges: automatic.length > 0,
    crossfireApprovalRequired,
  };
}

export function deploymentSummary(
  plan,
  { eventName, autoDeployEnabled, crossfireApprovalReady, crossfireApprovalReason },
) {
  let handoff = '';
  if (plan.migrationChanges && plan.selected.includes('crossfire')) {
    const instructions =
      'Pause further production pushes and verify Migration complete and Server running ' +
      "in the new main app's Coolify logs.";
    if (eventName !== 'push' || !autoDeployEnabled) {
      handoff =
        '\n\nCrossfire would wait for migration approval on an enabled push deployment. ' +
        instructions;
    } else if (crossfireApprovalReady) {
      handoff =
        '\n\n**Crossfire is waiting for migration approval.** ' +
        instructions +
        ' Then click **Review deployments → crossfire-migrations → Approve and deploy** ' +
        'in this run. The main app deploys independently; waiting for approval is not a failure.';
    } else {
      handoff =
        '\n\n**Crossfire was not requested: migration approval is not configured or could not be verified.** ' +
        (crossfireApprovalReason ? crossfireApprovalReason + ' ' : '') +
        `Check the GitHub environment \`${crossfireMigrationEnvironment}\` has required reviewers. ` +
        instructions +
        ' Then manually run this workflow for crossfire after verification. ' +
        'Re-run all jobs also checks approval setup again, but redeploys every selected service.';
    }
  }
  return (
    `## Coolify deployment plan\n\n${plan.reason}\n\n` +
    services
      .map(service => `- ${service}: ${plan.selected.includes(service) ? 'selected' : 'unchanged'}`)
      .join('\n') +
    handoff +
    '\n\nPull requests and manual dry runs never call Coolify. Automatic push deployments ' +
    `are ${autoDeployEnabled ? 'enabled' : 'disabled (set COOLIFY_DEPLOY_ENABLED=true to enable)'}.\n` +
    'A successful deployment job means Coolify accepted the request; check Coolify for build and runtime status.\n'
  );
}

async function main() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const eventName = process.env.GITHUB_EVENT_NAME;
  const plan = planDeployments(eventName, event);
  const jobs = deploymentJobs(plan, eventName);
  const autoDeployEnabled = process.env.AUTO_DEPLOY_ENABLED === 'true';
  let approval;
  if (
    jobs.crossfireApprovalRequired &&
    autoDeployEnabled &&
    process.env.GITHUB_REPOSITORY === 'the-medo/swu-collection' &&
    process.env.GITHUB_REF === 'refs/heads/main'
  ) {
    approval = await crossfireApprovalStatus({
      repository: process.env.GITHUB_REPOSITORY,
      token: process.env.GITHUB_TOKEN,
    });
    if (!approval.ready)
      console.log(
        `::warning::Crossfire deployment is held. ${approval.reason} See the deployment plan for recovery.`,
      );
  }
  const crossfireApprovalReady = approval?.ready === true;
  const output =
    `matrix=${JSON.stringify(jobs.matrix)}\n` +
    `has_changes=${jobs.hasChanges}\n` +
    `crossfire_approval_required=${jobs.crossfireApprovalRequired}\n` +
    `crossfire_approval_ready=${Boolean(crossfireApprovalReady)}\n`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
  const summary = deploymentSummary(plan, {
    eventName,
    autoDeployEnabled,
    crossfireApprovalReady,
    crossfireApprovalReason: approval?.reason,
  });
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
