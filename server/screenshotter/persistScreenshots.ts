import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { screenshotter } from '../db/schema/screenshotter.ts';
import type { ScreenshotterManifest, ScreenshotterResult } from '../../types/Screenshotter.ts';
import type { PersistScreenshotterManifestResult } from './types.ts';

type SuccessfulScreenshotterResult = ScreenshotterResult & {
  ok: true;
  r2Key: string;
  url: string;
  contentType: string;
};

function isSuccessfulResult(result: ScreenshotterResult): result is SuccessfulScreenshotterResult {
  return result.ok && Boolean(result.r2Key && result.url && result.contentType);
}

export async function persistScreenshotterManifest(
  manifest: ScreenshotterManifest,
): Promise<PersistScreenshotterManifestResult> {
  const persisted: PersistScreenshotterManifestResult['persisted'] = [];
  const skippedFailures: ScreenshotterResult[] = [];
  const now = new Date().toISOString();

  for (const result of manifest.results) {
    if (isSuccessfulResult(result)) {
      await db
        .insert(screenshotter)
        .values({
          scopeType: manifest.scope.type,
          scopeId: manifest.scope.id ?? null,
          scopeKey: manifest.scope.key,
          target: result.target,
          r2Key: result.r2Key,
          url: result.url,
          contentType: result.contentType,
          byteSize: result.byteSize ?? null,
          width: result.width ?? null,
          height: result.height ?? null,
          sourceUrl: result.sourceUrl,
          status: 'success',
          error: null,
          generatedAt: manifest.generatedAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [screenshotter.scopeKey, screenshotter.target],
          set: {
            scopeType: manifest.scope.type,
            scopeId: manifest.scope.id ?? null,
            r2Key: result.r2Key,
            url: result.url,
            contentType: result.contentType,
            byteSize: result.byteSize ?? null,
            width: result.width ?? null,
            height: result.height ?? null,
            sourceUrl: result.sourceUrl,
            status: 'success',
            error: null,
            generatedAt: manifest.generatedAt,
            updatedAt: now,
          },
        });

      persisted.push({ ...result, persisted: true });
      continue;
    }

    const [updatedFailure] = await db
      .update(screenshotter)
      .set({
        status: 'failed',
        error: result.error ?? 'Screenshot capture failed.',
        sourceUrl: result.sourceUrl,
        generatedAt: manifest.generatedAt,
        updatedAt: now,
      })
      .where(
        and(
          eq(screenshotter.scopeKey, manifest.scope.key),
          eq(screenshotter.target, result.target),
        ),
      )
      .returning({ id: screenshotter.id });

    if (updatedFailure) {
      persisted.push({ ...result, persisted: true });
    } else {
      skippedFailures.push(result);
    }
  }

  return { persisted, skippedFailures };
}
