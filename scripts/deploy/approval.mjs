export const crossfireMigrationEnvironment = 'crossfire-migrations';

export async function crossfireApprovalStatus({ repository, token }, request = fetch) {
  // An environment named in YAML is created without protection rules if it
  // does not exist. Verify reviewers before allowing a migration handoff job.
  try {
    const response = await request(
      `https://api.github.com/repos/${repository}/environments/${crossfireMigrationEnvironment}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok)
      return { ready: false, reason: `GitHub environment check returned HTTP ${response.status}.` };
    const environment = await response.json();
    const rule =
      Array.isArray(environment?.protection_rules) &&
      environment.protection_rules.find(rule => rule?.type === 'required_reviewers');
    if (!Array.isArray(rule?.reviewers) || rule.reviewers.length === 0)
      return { ready: false, reason: 'The environment has no required reviewers.' };
    if (rule.prevent_self_review === true)
      return {
        ready: false,
        reason: 'Prevent self-review must be disabled for operator approval.',
      };
    return { ready: true };
  } catch {
    // Missing setup or an unavailable API must not send a premature webhook or
    // turn a normal migration handoff into a failed deployment notification.
    return { ready: false, reason: 'GitHub environment check failed or timed out.' };
  }
}
