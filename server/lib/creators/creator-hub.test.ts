import { creatorMigrationSection } from './migration-fixture.ts';
import { expect, test } from 'bun:test';
import { groupDiscoveryTags } from './service.ts';
import { seal, unseal } from './youtube.ts';
import {
  creationDocumentSchema,
  creatorProfileSchema,
} from '../../../shared/creators/contracts.ts';
import { youtubeVideoId, youtubeChapters } from '../../../shared/creators/youtube.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';
import { normalizeTagIds, toggleTagIds } from '../../../shared/creators/taxonomy.ts';
import { languageInfo } from '../../../shared/creators/languages.ts';

test('discovery combines alternatives within dimensions and expands parent formats', () => {
  expect(groupDiscoveryTags('purpose:deck-guide,purpose:gameplay,format:limited')).toEqual([
    ['purpose:deck-guide', 'purpose:gameplay'],
    ['format:draft', 'format:sealed'],
  ]);
  expect(() => groupDiscoveryTags('purpose:invented')).toThrow('Unknown');
});
test('group toggles persist child formats and leave Twin Suns independent', () => {
  const selected = toggleTagIds(
    ['format:twin-suns', 'purpose:gameplay'],
    'format:constructed',
    true,
  );
  expect(selected).toEqual([
    'format:twin-suns',
    'purpose:gameplay',
    'format:premier',
    'format:eternal',
  ]);
  expect(toggleTagIds(selected, 'format:premier', false)).toEqual([
    'format:twin-suns',
    'purpose:gameplay',
    'format:eternal',
  ]);
  expect(toggleTagIds(selected, 'format:constructed', false)).toEqual([
    'format:twin-suns',
    'purpose:gameplay',
  ]);
  expect(toggleTagIds(['format:limited'], 'format:draft', false)).toEqual(['format:sealed']);
});
test('old classifications collapse without duplicates and old filter URLs remain valid', () => {
  const old = [
    'purpose:deck-tech',
    'purpose:deck-guide',
    'audience:intermediate',
    'environment:karabast',
    'environment:webcam',
    'topic:mulligans',
    'topic:sequencing',
  ];
  const mapped = [
    'purpose:deck-guide',
    'audience:advanced',
    'environment:online',
    'topic:play-decisions',
  ];
  expect(normalizeTagIds(old)).toEqual(mapped);
  expect(groupDiscoveryTags(old.join(','))).toEqual(mapped.map(id => [id]));
  expect(groupDiscoveryTags('format:constructed')).toEqual([['format:premier', 'format:eternal']]);
  expect(() => groupDiscoveryTags('toString')).toThrow('Unknown');
});
test('language cues retain regional variants and valid canonical language codes', () => {
  expect(languageInfo('pt-br')).toMatchObject({
    code: 'pt-BR',
    label: 'Brazilian Portuguese',
    flag: '🇧🇷',
  });
  expect(languageInfo('en')).toMatchObject({ flag: '🇬🇧', countryCode: 'gb' });
  expect(languageInfo('en-US').countryCode).toBe('us');
  expect(languageInfo('pt-br').countryCode).toBe('br');
  expect(languageInfo('invalid_code').countryCode).toBeUndefined();
  expect(languageInfo('zh-Hant').flag).toBe('🇹🇼');
});
test('existing full profiles remain editable after group expansion and canonicalize duplicate languages', () => {
  const specialties = [
    'medium:article',
    'medium:video',
    'medium:audio',
    'medium:external',
    'purpose:deck-guide',
    'purpose:meta-report',
    'purpose:gameplay',
    'purpose:match-analysis',
    'purpose:tournament-report',
    'purpose:card-review',
    'purpose:spoiler-preview',
    'purpose:news',
    'purpose:tutorial',
    'purpose:strategy',
    'purpose:discussion',
    'purpose:unboxing',
    'audience:beginner',
    'audience:advanced',
    'format:constructed',
    'format:limited',
  ];
  const profile = creatorProfileSchema.parse({
    slug: 'full-profile',
    name: 'Full profile',
    bio: emptyPostDocument(),
    links: [],
    languages: ['EN', 'en', 'pt-br'],
    specialties,
  });
  expect(profile.specialties).toHaveLength(22);
  expect(profile.languages).toEqual(['en', 'pt-BR']);
  expect(creatorProfileSchema.safeParse(profile).success).toBe(true);
});
test('YouTube links reject lookalike hosts, credential URLs and malformed video IDs', () => {
  expect(youtubeVideoId('https://www.youtube.com/watch?v=abcdefghijk&t=30')).toBe('abcdefghijk');
  expect(youtubeVideoId('https://youtu.be/abcdefghijk')).toBe('abcdefghijk');
  expect(youtubeVideoId('https://youtube.com/shorts/abcdefghijk')).toBe('abcdefghijk');
  for (const url of [
    'https://youtube.com.evil.test/watch?v=abcdefghijk',
    'https://youtube.com@evil.test/watch?v=abcdefghijk',
    'javascript:alert(1)',
    'https://youtu.be/short',
  ])
    expect(youtubeVideoId(url)).toBeNull();
});
test('provider secrets use authenticated encryption', () => {
  const key = '7f'.repeat(32),
    encrypted = seal('private-refresh-token', key);
  expect(encrypted).not.toContain('private-refresh-token');
  expect(unseal(encrypted, key)).toBe('private-refresh-token');
  expect(() => unseal(encrypted, '3e'.repeat(32))).toThrow();
  const parts = encrypted.split('.');
  parts[2] = Buffer.from('tampered').toString('base64url');
  expect(() => unseal(parts.join('.'), key)).toThrow();
});
test('content contracts reject unsafe links and invalid context without requiring invented tags', () => {
  const document = {
    title: 'Draft guide',
    medium: 'article',
    body: emptyPostDocument(),
    tags: [],
    references: [],
    chapters: [],
  };
  expect(
    creationDocumentSchema.safeParse({ ...document, sourceUrl: '', coverUrl: '' }).success,
  ).toBe(true);
  expect(creationDocumentSchema.safeParse({ ...document, medium: 'video' }).success).toBe(false);
  expect(
    creationDocumentSchema.safeParse({ ...document, sourceUrl: 'javascript:alert(1)' }).success,
  ).toBe(false);
  expect(
    creationDocumentSchema.safeParse({ ...document, language: 'not a language' }).success,
  ).toBe(false);
  expect(
    creationDocumentSchema.safeParse({
      ...document,
      chapters: [
        { title: 'Later', startSeconds: 10 },
        { title: 'Earlier', startSeconds: 0 },
      ],
    }).success,
  ).toBe(false);
  expect(
    creatorProfileSchema.safeParse({
      slug: 'creator',
      name: 'Creator',
      bio: emptyPostDocument(),
      languages: ['en'],
      specialties: [],
      links: [{ kind: 'social', label: 'Bad', url: 'data:text/html,bad' }],
    }).success,
  ).toBe(false);
});

test('description chapters retain valid increasing creator timestamps', () => {
  expect(
    youtubeChapters(
      'Intro\n0:00 Opening\n01:30 - Deck choices\n01:80 Invalid\n00:10 Out of order\n1:02:05 Final game',
    ),
  ).toEqual([
    { title: 'Opening', startSeconds: 0 },
    { title: 'Deck choices', startSeconds: 90 },
    { title: 'Final game', startSeconds: 3725 },
  ]);
});

test('the taxonomy seed covers every curated identifier and dimension exactly once', async () => {
  const { creationTags } = await import('../../../shared/creators/taxonomy.ts');
  const migration = await creatorMigrationSection('creator_taxonomy_simplified');
  const rows = [...migration.matchAll(/^\('([^']+)', '([^']+)', '([^']+)'/gm)].map(match => ({
    id: match[1],
    dimension: match[2],
    slug: match[3],
  }));
  expect(rows).toEqual(creationTags.map(({ id, dimension, slug }) => ({ id, dimension, slug })));
});
