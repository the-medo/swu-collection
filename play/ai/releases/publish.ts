import { resolve } from 'node:path';
import { statSync } from 'node:fs';
import { aiReleaseSchema } from '../../../shared/types/crossfire-ai-releases.ts';
import { configuredAiObjects, publishRelease } from './objects.ts';

if (import.meta.main) {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3)
    throw new Error('Usage: bun play/ai/releases/publish.ts <release-directory>');
  const root = resolve(path);
  if (
    statSync(resolve(root, 'release.json')).size > 2_000_000 ||
    statSync(resolve(root, 'model.pt')).size > 32_000_000
  )
    throw new Error('Release exceeds size limit');
  const release = aiReleaseSchema.parse(await Bun.file(resolve(root, 'release.json')).json());
  const objects = configuredAiObjects();
  if (!objects) throw new Error('Configure the explicit private CROSSFIRE_AI_BUCKET');
  console.log(
    await publishRelease(
      objects,
      release,
      Buffer.from(await Bun.file(resolve(root, 'model.pt')).arrayBuffer()),
    ),
  );
}
