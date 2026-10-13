import { expect, test } from 'bun:test';
import { documentFromVideo, type VideoMetadata } from './video.ts';
import { videoDocument, descriptionDeckLinks } from './worker/metadata.ts';
import { ANALYSIS_VERSION, type Analysis } from './worker/contracts.ts';

test('manual and worker imports retain full descriptions, late links, chapters and language', () => {
  const description =
    'Star Wars Unlimited guide\n' +
    'More details. '.repeat(100) +
    '\n\nhttps://swuforge.com/decks/long-description\n0:00 Introduction\n2:30 Sideboarding\n';
  const metadata: VideoMetadata = {
    id: 'abcdefghijk',
    channelId: 'UCabcdefghijklmnopqrstuv',
    title: 'SWU deck guide',
    description,
    durationSeconds: 600,
    language: 'fr',
    thumbnail: '',
    publishedAt: '2026-10-01T00:00:00Z',
  };
  const analysis: Analysis = {
    version: ANALYSIS_VERSION,
    metadataHash: '',
    relevance: 'primary',
    confidence: 1,
    evidence: 'SWU',
    reason: '',
    language: 'en',
    tags: [],
    leaders: [],
    sets: [],
  };
  const manual = documentFromVideo(metadata, { fallbackLanguage: 'en' });
  const worker = videoDocument(metadata, analysis, 'en', []);
  expect({ ...worker, body: null }).toEqual({ ...manual, body: null });
  expect(manual.videoDescription).toBe(description);
  expect(manual.summary.length).toBeLessThanOrEqual(1000);
  expect(manual.summary).not.toContain('swuforge');
  expect(descriptionDeckLinks(manual.videoDescription).links[0].sourceDeckId).toBe(
    'long-description',
  );
  expect(manual.chapters).toEqual([
    { startSeconds: 0, title: 'Introduction' },
    { startSeconds: 150, title: 'Sideboarding' },
  ]);
  expect(manual.language).toBe('fr');
  expect(
    documentFromVideo({ ...metadata, language: 'und' }, { fallbackLanguage: 'pt-BR' }).language,
  ).toBe('pt-BR');
});
