import type { ScreenshotterConfig } from './types.ts';

const DEFAULT_LOCAL_APP_BASE_URL = 'http://localhost:5173';
const DEFAULT_R2_PUBLIC_BASE_URL = 'https://images.swubase.com';
const DEFAULT_R2_BUCKET_NAME = 'swu-images';
const DEFAULT_VIEWPORT_WIDTH = 1440;
const DEFAULT_VIEWPORT_HEIGHT = 1200;
const DEFAULT_DEVICE_SCALE_FACTOR = 1;
const DEFAULT_TIMEOUT_MS = 60_000;

function isLocalEnvironment() {
  return process.env.ENVIRONMENT === 'local' || process.env.NODE_ENV !== 'production';
}

function readNumberEnv(name: string, fallback: number) {
  const rawValue = readStringEnv(name);
  if (!rawValue) return fallback;

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number`);
  }

  return parsed;
}

function readStringEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function normalizeScreenshotterBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

export function joinScreenshotterUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeScreenshotterBaseUrl(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export function getScreenshotterConfig(): ScreenshotterConfig {
  const configuredAppBaseUrl = readStringEnv('SCREENSHOTTER_APP_BASE_URL');
  const appBaseUrl = configuredAppBaseUrl ?? DEFAULT_LOCAL_APP_BASE_URL;

  if (!configuredAppBaseUrl && !isLocalEnvironment()) {
    throw new Error('SCREENSHOTTER_APP_BASE_URL is required outside local development.');
  }

  return {
    appBaseUrl: normalizeScreenshotterBaseUrl(appBaseUrl),
    timeoutMs: readNumberEnv('SCREENSHOTTER_TIMEOUT_MS', DEFAULT_TIMEOUT_MS),
    viewport: {
      width: readNumberEnv('SCREENSHOTTER_VIEWPORT_WIDTH', DEFAULT_VIEWPORT_WIDTH),
      height: readNumberEnv('SCREENSHOTTER_VIEWPORT_HEIGHT', DEFAULT_VIEWPORT_HEIGHT),
      deviceScaleFactor: readNumberEnv(
        'SCREENSHOTTER_DEVICE_SCALE_FACTOR',
        DEFAULT_DEVICE_SCALE_FACTOR,
      ),
    },
    r2: {
      bucketName: readStringEnv('SCREENSHOTTER_R2_BUCKET_NAME') ?? DEFAULT_R2_BUCKET_NAME,
      endpoint: readStringEnv('SCREENSHOTTER_R2_ENDPOINT') ?? readStringEnv('R2_ENDPOINT'),
      accessKeyId:
        readStringEnv('SCREENSHOTTER_R2_ACCESS_KEY_ID') ?? readStringEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey:
        readStringEnv('SCREENSHOTTER_R2_SECRET_ACCESS_KEY') ??
        readStringEnv('R2_SECRET_ACCESS_KEY'),
      publicBaseUrl: normalizeScreenshotterBaseUrl(
        readStringEnv('SCREENSHOTTER_R2_PUBLIC_BASE_URL') ?? DEFAULT_R2_PUBLIC_BASE_URL,
      ),
    },
  };
}
