// These boundaries describe runtime dependencies, not every file copied into an
// image. Keep this map in sync with Dockerfiles and cross-service imports.
export const services = ['main', 'maintainer', 'crossfire'];
const appAndWorker = ['main', 'crossfire'];

export function servicesForPath(path) {
  if (
    /\.md$/i.test(path) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(path) ||
    /^(docs|\.ai|\.agents|\.codex|\.idea|\.junie)\//.test(path) ||
    /^play\/(testing|integration|browser)\//.test(path) ||
    path.startsWith('scripts/worktree-dev/') ||
    [
      '.env.example',
      '.gitignore',
      '.prettierignore',
      '.prettierrc',
      '.worktreeinclude',
      'http-client.http',
      'setup-local-db.sh',
      'setup-local-db.ps1',
    ].includes(path)
  )
    return [];

  if (path.startsWith('scripts/remote-dev/')) return ['maintainer'];
  if (path === '.github/workflows/deploy.yml' || path.startsWith('scripts/deploy/')) {
    return services;
  }
  if (path.startsWith('.github/')) return [];
  if (path.startsWith('frontend/') || path === 'Dockerfile') return ['main'];
  // The API may only type-import play/worker modules. If a runtime import is
  // introduced, expand this rule to include main in the same change.
  if (
    path.startsWith('play/worker/') ||
    path.startsWith('play/deploy/') ||
    ['Dockerfile.crossfire', 'Dockerfile.crossfire.dockerignore'].includes(path)
  ) {
    return ['crossfire'];
  }

  if (path.startsWith('server/')) {
    // Worker imports Crossfire adapters, Discord delivery and Drizzle schemas.
    // Auth and catalog changes are conservative shared-dependency triggers too.
    return /^server\/(lib\/(crossfire|discord)|db|auth)\//.test(path) ? appAndWorker : ['main'];
  }
  // The API creates initial game states through play/host/durable-game.ts, which
  // imports the engine. Engine/cards/host changes cannot safely be worker-only.
  if (
    /^(play|shared|types|lib|drizzle)\//.test(path) ||
    [
      'package.json',
      'bun.lock',
      'bun.lockb',
      'bunfig.toml',
      'tsconfig.json',
      'migrate.ts',
      'drizzle.config.ts',
      '.dockerignore',
    ].includes(path)
  ) {
    return appAndWorker;
  }
  // New, unclassified build inputs deploy everything rather than silently going
  // stale. Add a narrower rule when introducing a new directory or root config.
  return services;
}

export function selectServices(paths) {
  const selected = new Set(paths.flatMap(servicesForPath));
  return services.filter(service => selected.has(service));
}

export function deploymentMatrix(selected) {
  return {
    include: selected.map(service => ({
      service,
      webhook_secret: `COOLIFY_WEBHOOK_${service.toUpperCase()}`,
    })),
  };
}
