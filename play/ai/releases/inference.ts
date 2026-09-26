import { z } from 'zod';
import type { AiRelease, AiVersions } from '../../../shared/types/crossfire-ai-releases.ts';
import { AiError } from './objects.ts';

export interface AiInference {
  load(release: AiRelease, weights: Buffer): Promise<{ parameters: number }>;
  choose(
    release: AiRelease,
    versions: AiVersions,
    deckKey: string,
    observation: unknown,
  ): Promise<{ action: number; value: number; releaseId: string; artifact: string }>;
}
export function configuredAiInference(
  env: Record<string, string | undefined> = process.env,
): AiInference | null {
  const base = env.CROSSFIRE_AI_INFERENCE_URL;
  const token = env.CROSSFIRE_AI_INFERENCE_TOKEN;
  if (!base && !token) return null;
  let url: URL;
  try {
    url = new URL(base!);
  } catch {
    throw new AiError('AI inference configuration is incomplete');
  }
  if (
    !base ||
    !token ||
    token.length < 32 ||
    !/^https?:$/.test(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new AiError('AI inference configuration is incomplete');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  async function request<T>(
    endpoint: string,
    body: unknown,
    timeout: number,
    schema: z.ZodType<T>,
    retryBusy = true,
  ): Promise<T> {
    try {
      const response = await fetch(new URL(endpoint.replace(/^\//, ''), url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
        redirect: 'error',
      });
      if (response.status === 503 || response.status === 429) {
        await response.body?.cancel();
        if (retryBusy) {
          await new Promise(resolve => setTimeout(resolve, 200));
          return request(endpoint, body, timeout, schema, false);
        }
        throw new AiError('AI inference service is busy; retry shortly');
      }
      if (!response.ok)
        throw new AiError(
          response.status === 409
            ? 'Pinned model needs reloading'
            : 'AI inference validation failed',
        );
      if (!response.body) throw new AiError('Empty inference response');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 4096) {
            await reader.cancel();
            throw new AiError('Invalid inference response');
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      return schema.parse(JSON.parse(Buffer.concat(chunks).toString()));
    } catch (error) {
      if (error instanceof AiError) throw error;
      throw new AiError('AI inference service is unavailable');
    }
  }
  return {
    load: (release, weights) =>
      request(
        '/load',
        { release, weights: weights.toString('base64') },
        30_000,
        z.strictObject({ parameters: z.number().int().positive() }),
      ),
    choose: (release, versions, deckKey, observation) =>
      request(
        '/choose',
        { releaseId: release.id, versions, deckKey, observation },
        5000,
        z.strictObject({
          action: z.number().int().nonnegative(),
          value: z.number().finite(),
          releaseId: z.literal(release.id),
          artifact: z.literal(release.artifact.sha256),
        }),
      ),
  };
}
