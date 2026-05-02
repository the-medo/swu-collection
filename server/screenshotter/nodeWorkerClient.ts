import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import type { ScreenshotterScope, ScreenshotterTarget } from '../../types/Screenshotter.ts';
import type { ScreenshotterCapturedImage, ScreenshotterConfig } from './types.ts';

export type CapturedTargetResult =
  | {
      ok: true;
      captured: ScreenshotterCapturedImage;
    }
  | {
      ok: false;
      target: ScreenshotterTarget;
      sourceUrl: string;
      error: string;
    };

type NodeCaptureWorkerRequest = {
  scope: ScreenshotterScope;
  targets: ScreenshotterTarget[];
  config: ScreenshotterConfig;
};

type NodeCapturedImage = Omit<ScreenshotterCapturedImage, 'body'> & {
  ok: true;
  bodyBase64: string;
};

type NodeFailedCapture = {
  ok: false;
  target: ScreenshotterTarget;
  sourceUrl: string;
  error: string;
};

type NodeCaptureWorkerCapture = NodeCapturedImage | NodeFailedCapture;

type NodeCaptureWorkerResponse =
  | {
      ok: true;
      captures: NodeCaptureWorkerCapture[];
    }
  | {
      ok: false;
      error: string;
    };

function readBooleanEnv(name: string) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return undefined;

  if (['1', 'true', 'yes', 'on', 'always'].includes(value)) return true;
  if (['0', 'false', 'no', 'off', 'never'].includes(value)) return false;

  return undefined;
}

export function shouldUseNodeScreenshotterWorker() {
  return readBooleanEnv('SCREENSHOTTER_NODE_WORKER') ?? process.platform === 'win32';
}

function getWorkerTimeoutMs(config: ScreenshotterConfig, targetCount: number) {
  const configuredTimeout = Number(process.env.SCREENSHOTTER_NODE_WORKER_TIMEOUT_MS);
  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return configuredTimeout;
  }

  return Math.max(config.timeoutMs + 30_000, config.timeoutMs * Math.max(targetCount + 1, 2));
}

function getNodeWorkerScriptPath() {
  return path.resolve(process.cwd(), 'server', 'screenshotter', 'nodeCaptureWorker.ts');
}

function getNodeBinary() {
  const configuredNodeBinary = process.env.SCREENSHOTTER_NODE_BINARY?.trim();
  if (configuredNodeBinary) return configuredNodeBinary;

  if (process.platform !== 'win32') return 'node';

  const result = spawnSync('where.exe', ['node'], {
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.status !== 0) return 'node';

  const candidates = result.stdout
    .split(/\r?\n/)
    .map(candidate => candidate.trim())
    .filter(Boolean);

  const realNode = candidates.find(candidate => {
    const normalized = candidate.toLowerCase();

    return (
      normalized.endsWith('\\node.exe') &&
      !normalized.includes('\\bun-node-') &&
      !normalized.includes('\\.bun\\')
    );
  });

  return realNode ?? 'node';
}

function parseWorkerResponse(stdout: string, stderr: string): NodeCaptureWorkerResponse {
  const trimmedOutput = stdout.trim();
  if (!trimmedOutput) {
    throw new Error(`Node screenshotter worker did not return JSON.${stderr ? `\n${stderr}` : ''}`);
  }

  try {
    return JSON.parse(trimmedOutput) as NodeCaptureWorkerResponse;
  } catch (error) {
    throw new Error(
      `Node screenshotter worker returned invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }${stderr ? `\n${stderr}` : ''}`,
    );
  }
}

function hydrateWorkerCapture(capture: NodeCaptureWorkerCapture[]): CapturedTargetResult[] {
  return capture.map(item => {
    if (!item.ok) return item;

    const { bodyBase64, ...captured } = item;

    return {
      ok: true,
      captured: {
        ...captured,
        body: Buffer.from(bodyBase64, 'base64'),
      },
    };
  });
}

export async function captureTargetsWithNodeWorker(
  request: NodeCaptureWorkerRequest,
): Promise<CapturedTargetResult[]> {
  const workerScript = getNodeWorkerScriptPath();
  const node = getNodeBinary();
  const timeoutMs = getWorkerTimeoutMs(request.config, request.targets.length);

  return new Promise((resolve, reject) => {
    const child = spawn(node, ['--experimental-strip-types', workerScript], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });
    child.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timeout);

      if (timedOut) {
        reject(new Error(`Node screenshotter worker timed out after ${timeoutMs}ms.`));
        return;
      }

      let response: NodeCaptureWorkerResponse;
      try {
        response = parseWorkerResponse(stdout, stderr);
      } catch (error) {
        reject(error);
        return;
      }

      if (!response.ok) {
        reject(
          new Error(
            `Node screenshotter worker failed: ${response.error}${stderr ? `\n${stderr}` : ''}`,
          ),
        );
        return;
      }

      if (code !== 0) {
        reject(
          new Error(
            `Node screenshotter worker exited with code ${code}.${stderr ? `\n${stderr}` : ''}`,
          ),
        );
        return;
      }

      resolve(hydrateWorkerCapture(response.captures));
    });

    child.stdin.end(JSON.stringify(request));
  });
}
