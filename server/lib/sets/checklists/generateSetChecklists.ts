import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { cardList } from '../../../db/lists.ts';
import type { SwuSet } from '../../../../types/enums.ts';
import { getChecklistDocuments, getChecklistLogo, renderChecklistPdfs } from './pdf.ts';
import { getChecklistCards } from './rows.ts';

const bucket = 'swu-images';
const cacheTime = 5 * 60_000;
type Documents = ReturnType<typeof getChecklistDocuments>;
type Download = Pick<Documents[number], 'layout' | 'paper'> & { url: string };
const requests = new Map<SwuSet, { expires: number; result: Promise<Download[]> }>();

// A burst of cold requests for different sets should share the renderer's capacity.
let renderQueue = Promise.resolve();
function render(documents: Documents) {
  const job = renderQueue.then(() => renderChecklistPdfs(documents));
  renderQueue = job.then(
    () => {},
    () => {},
  );
  return job;
}

export class ChecklistStorageUnavailable extends Error {}

async function publish(set: SwuSet): Promise<Download[]> {
  const cards = getChecklistCards(cardList, set);
  if (!cards.length) return [];

  const documents = getChecklistDocuments(set, cards, await getChecklistLogo(set));
  const revision = createHash('sha256')
    .update(JSON.stringify(documents))
    .digest('hex')
    .slice(0, 20);
  const prefix = `checklists/${set}/${revision}/`;
  const downloads = documents.map(doc => ({
    layout: doc.layout,
    paper: doc.paper,
    url: `https://images.swubase.com/${prefix}${doc.filename}`,
  }));
  // Check the public copies so already-published sets need no write credentials.
  // Keep availability probes off the download URLs to avoid caching a pre-upload 404 there.
  const probe = Date.now();
  const available = await Promise.all(
    downloads.map(async ({ url }) => {
      const response = await fetch(`${url}?check=${probe}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status === 404) return false;
      if (!response.ok) throw new Error(`Checklist lookup failed (HTTP ${response.status})`);
      return response.headers.get('content-type')?.split(';')[0] === 'application/pdf';
    }),
  );
  if (available.every(Boolean)) return downloads;

  const {
    R2_ENDPOINT: endpoint,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
  } = process.env;
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new ChecklistStorageUnavailable();
  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  try {
    const pdfs = await render(documents);
    for (const [i, doc] of documents.entries()) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: prefix + doc.filename,
          Body: pdfs[i],
          ContentType: 'application/pdf',
          ContentDisposition: `attachment; filename="${doc.filename}"`,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
    }
    return downloads;
  } finally {
    client.destroy();
  }
}

/** Resolve a complete edition, regenerating all layouts and paper sizes together when needed. */
export function generateSetChecklists(set: SwuSet): Promise<Download[]> {
  const cached = requests.get(set);
  if (cached && cached.expires > Date.now()) return cached.result;
  const entry = { expires: Infinity, result: publish(set) };
  requests.set(set, entry);
  // Keep errors briefly so a client polling a slow upload sees the failure.
  void entry.result.then(
    () => {
      entry.expires = Date.now() + cacheTime;
    },
    () => {
      entry.expires = Date.now() + 5_000;
    },
  );
  return entry.result;
}
