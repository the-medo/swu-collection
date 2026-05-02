import type { Browser, BrowserContext, Page } from 'playwright';
import type {
  ScreenshotterManifest,
  ScreenshotterResult,
  ScreenshotterScope,
  ScreenshotterTarget,
  ScreenshotterViewport,
} from '../../types/Screenshotter.ts';

export type ScreenshotterR2Config = {
  bucketName: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBaseUrl: string;
};

export type ScreenshotterConfig = {
  appBaseUrl: string;
  timeoutMs: number;
  viewport: ScreenshotterViewport;
  r2: ScreenshotterR2Config;
};

export type ScreenshotterUploadInput = {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  cacheControl?: string;
};

export type ScreenshotterUploadResult = {
  r2Key: string;
  url: string;
  contentType: string;
  byteSize: number;
};

export type ScreenshotterCapturedImage = {
  target: ScreenshotterTarget;
  sourceUrl: string;
  r2Key: string;
  body: Buffer;
  contentType: string;
  byteSize: number;
  width?: number;
  height?: number;
};

export type ScreenshotterPersistedResult = ScreenshotterResult & {
  persisted: boolean;
};

export type ScreenshotterOutputFile = {
  target: ScreenshotterTarget | 'manifest';
  path: string;
};

export type PersistScreenshotterManifestResult = {
  persisted: ScreenshotterPersistedResult[];
  skippedFailures: ScreenshotterResult[];
};

export type ScreenshotterPageSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  ownsBrowser: boolean;
};

export type ScreenshotterCaptureContext = {
  config: ScreenshotterConfig;
  manifest: ScreenshotterManifest;
};

export type ScreenshotterTargetDefinition = {
  target: ScreenshotterTarget;
  scope: ScreenshotterScope;
  url: string;
  selector: string;
};

export type CaptureScreenshotsOptions = {
  scope: ScreenshotterScope;
  targets?: ScreenshotterTarget[];
  skipUpload?: boolean;
  outputDir?: string;
  persist?: boolean;
  config?: ScreenshotterConfig;
};

export type CaptureScreenshotsResult = {
  manifest: ScreenshotterManifest;
  manifestUpload?: ScreenshotterUploadResult;
  outputFiles: ScreenshotterOutputFile[];
  persistence?: PersistScreenshotterManifestResult;
};
