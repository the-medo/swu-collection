import { expect, test } from 'bun:test';
import { creatorImportSchema, MAX_CREATOR_IMPORT_BYTES } from '../../../shared/creators/imports.ts';

const profile = {
  slug: 'fixture-creator',
  name: 'Fixture creator',
  languages: ['en'],
  specialties: [],
  links: [{ label: 'YouTube', url: `https://www.youtube.com/channel/UC${'a'.repeat(22)}` }],
};
const payload = { kind: 'swubase-creator-import', schemaVersion: 1, creators: [profile] };

test('a file near the byte limit is checked again after defaults are added', () => {
  const large = {
    ...payload,
    creators: Array.from({ length: 200 }, (_, i) => ({
      ...profile,
      slug: `fixture-${i}`,
      bio: '界'.repeat(8000),
      introduction: '',
      links: [
        {
          label: 'YouTube',
          url: `https://www.youtube.com/channel/UC${String(i).padStart(22, '0')}`,
        },
      ],
    })),
  };
  const size = () => new TextEncoder().encode(JSON.stringify(large)).byteLength;
  let low = 0,
    high = 2000;
  while (low < high) {
    const length = Math.ceil((low + high) / 2);
    large.creators.forEach(p => {
      p.introduction = 'x'.repeat(length);
    });
    if (size() <= MAX_CREATOR_IMPORT_BYTES) low = length;
    else high = length - 1;
  }
  large.creators.forEach(p => {
    p.introduction = 'x'.repeat(low);
  });
  expect(size()).toBeLessThanOrEqual(MAX_CREATOR_IMPORT_BYTES);
  const parsed = creatorImportSchema.safeParse(large);
  expect(parsed.success).toBe(false);
  if (!parsed.success)
    expect(parsed.error.issues.some(i => i.message.includes('normalized import exceeds'))).toBe(
      true,
    );
});

test('portable imports validate canonical channels and reject authority, duplicates, and invalid links', () => {
  expect(creatorImportSchema.parse(payload).creators[0].bio).toBe('');
  for (const extra of [{ ownerId: 'someone' }, { id: crypto.randomUUID() }, { youtube: [] }])
    expect(
      creatorImportSchema.safeParse({ ...payload, creators: [{ ...profile, ...extra }] }).success,
    ).toBe(false);
  for (const url of [
    'https://www.youtube.com/@example',
    'https://youtube.com.evil.test/channel/UC' + 'a'.repeat(22),
    'javascript:alert(1)',
    'invalid',
  ])
    expect(
      creatorImportSchema.safeParse({
        ...payload,
        creators: [{ ...profile, links: [{ label: 'YouTube', url }] }],
      }).success,
    ).toBe(false);
  expect(
    creatorImportSchema.safeParse({
      ...payload,
      creators: [profile, { ...profile, slug: 'another-creator' }],
    }).success,
  ).toBe(false);
  expect(creatorImportSchema.safeParse({ ...payload, creators: [] }).success).toBe(false);
  const video = { videoId: 'abcdefghijk', channelId: `UC${'a'.repeat(22)}` };
  expect(creatorImportSchema.safeParse({ ...payload, videos: [video, video] }).success).toBe(false);
  expect(
    creatorImportSchema.safeParse({
      ...payload,
      videos: [{ ...video, creatorId: crypto.randomUUID() }],
    }).success,
  ).toBe(false);
  expect(
    creatorImportSchema.safeParse({
      ...payload,
      creators: [
        {
          ...profile,
          links: [
            ...profile.links,
            { label: 'Second channel', url: `https://youtube.com/channel/UC${'b'.repeat(22)}` },
            { label: 'Featured video', url: 'https://www.youtube.com/watch?v=abcdefghijk' },
          ],
        },
      ],
    }).success,
  ).toBe(true);
});
