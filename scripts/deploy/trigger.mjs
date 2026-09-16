import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { services } from './services.mjs';

export async function triggerDeployment({ service, webhook, token }, request = fetch) {
  if (!services.includes(service)) throw new Error('Invalid deployment service');
  if (!token?.trim()) throw new Error('Missing COOLIFY_TOKEN secret');
  if (!webhook?.trim()) throw new Error(`Missing COOLIFY_WEBHOOK_${service.toUpperCase()} secret`);
  let url;
  try {
    url = new URL(webhook);
  } catch {
    throw new Error('Invalid Coolify webhook URL');
  }
  const uuid = url.searchParams.get('uuid');
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    url.pathname !== '/api/v1/deploy' ||
    !/^[a-zA-Z0-9-]+$/.test(uuid ?? '') ||
    url.searchParams.getAll('uuid').length !== 1 ||
    [...url.searchParams.keys()].some(key => !['uuid', 'force'].includes(key))
  ) {
    throw new Error(
      'Use the HTTPS Deploy Webhook (auth required) for one resource, without tags or preview parameters',
    );
  }
  // Preserve the normal cached build; force=true is an operator action in Coolify.
  url.searchParams.set('force', 'false');
  let response;
  try {
    response = await request(url, {
      method: 'GET',
      redirect: 'error',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    // Do not log the URL/token or automatically retry an ambiguous request:
    // Coolify may already have queued it before a timeout/network failure.
    throw new Error(
      'Coolify request failed or timed out. Check its deployment queue before retrying.',
    );
  }
  if (!response.ok) throw new Error(`Coolify rejected the request (HTTP ${response.status})`);
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('Coolify returned an invalid JSON response');
  }
  // Coolify can return HTTP 200 with a per-resource authorization error. Only a
  // queued application deployment is accepted, including Git-backed Compose apps.
  const deployment = Array.isArray(body?.deployments)
    ? body.deployments.find(item => item?.resource_uuid === uuid)
    : undefined;
  if (!/^[a-zA-Z0-9-]+$/.test(deployment?.deployment_uuid ?? '')) {
    throw new Error(
      'Coolify did not queue an application deployment. Check the token permissions and use a Git-backed application webhook.',
    );
  }
  return deployment.deployment_uuid;
}

async function main() {
  const service = process.env.DEPLOY_SERVICE;
  const deployment = await triggerDeployment({
    service,
    webhook: process.env.COOLIFY_WEBHOOK,
    token: process.env.COOLIFY_TOKEN,
  });
  const summary = `Coolify queued ${service} deployment: ${deployment}. Check Coolify for completion.\n`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
