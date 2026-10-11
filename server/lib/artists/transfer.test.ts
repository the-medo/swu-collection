import { describe, expect, test } from 'bun:test';
import {
  artistExportChecksum,
  artistExportSchema,
  mergeArtistProfile,
  parseArtistExport,
  type ArtistExport,
} from './transfer.ts';

const payload: ArtistExport = {
  format: 'swubase-artist-profiles',
  version: 1,
  exportedAt: '2026-10-11T00:00:00.000Z',
  artists: [
    {
      key: 'artist',
      name: 'Artist',
      biography: null,
      links: [{ label: 'Portfolio', url: 'https://example.com/art' }],
    },
  ],
};

describe('artist profile transfer', () => {
  test('v2 aliases require existing profiles and reject ambiguity, cycles and chains', () => {
    const artists = ['canonical', 'alias', 'other'].map(key => ({ ...payload.artists[0], key }));
    const v2 = {
      ...payload,
      version: 2,
      artists,
      aliases: [{ key: 'alias', canonicalKey: 'canonical' }],
    };
    expect(artistExportSchema.safeParse(v2).success).toBe(true);
    for (const aliases of [
      [{ key: 'alias', canonicalKey: 'missing' }],
      [{ key: 'alias', canonicalKey: 'alias' }],
      [
        { key: 'alias', canonicalKey: 'canonical' },
        { key: 'canonical', canonicalKey: 'alias' },
      ],
      [
        { key: 'alias', canonicalKey: 'canonical' },
        { key: 'other', canonicalKey: 'alias' },
      ],
      [
        { key: 'alias', canonicalKey: 'canonical' },
        { key: 'alias', canonicalKey: 'other' },
      ],
    ])
      expect(artistExportSchema.safeParse({ ...v2, aliases }).success).toBe(false);
  });
  test('validates checksums, versions, identities and links before import', () => {
    const bytes = Buffer.from(JSON.stringify(payload));
    expect(parseArtistExport(bytes, artistExportChecksum(bytes))).toEqual(payload);
    expect(() => parseArtistExport(bytes, '0'.repeat(64))).toThrow('SHA-256');
    expect(() => parseArtistExport(Buffer.alloc(10 * 1024 * 1024 + 1))).toThrow('10 MiB');
    expect(artistExportSchema.safeParse({ ...payload, version: 2 }).success).toBe(false);
    expect(
      artistExportSchema.safeParse({
        ...payload,
        artists: [...payload.artists, ...payload.artists],
      }).success,
    ).toBe(false);
    for (const key of [' Artist ', '', 'ARTIST']) {
      expect(
        artistExportSchema.safeParse({ ...payload, artists: [{ ...payload.artists[0], key }] })
          .success,
      ).toBe(false);
    }
    for (const url of ['javascript:alert(1)', 'https://user:password@example.com/']) {
      expect(
        artistExportSchema.safeParse({
          ...payload,
          artists: [{ ...payload.artists[0], links: [{ label: 'Bad', url }] }],
        }).success,
      ).toBe(false);
    }
  });

  test('merge preserves editorial changes, fills gaps and is idempotent', () => {
    const current = { ...payload.artists[0], name: 'Curated name', biography: 'Curated biography' };
    const incoming = {
      ...payload.artists[0],
      biography: 'Imported biography',
      links: [
        { label: 'Changed label', url: 'https://example.com/art' },
        { label: 'Shop', url: 'https://example.com/shop' },
      ],
    };
    const result = mergeArtistProfile(current, incoming, 'merge');
    expect(result.name).toBe(current.name);
    expect(result.biography).toBe(current.biography);
    expect(result.links).toEqual([current.links[0], incoming.links[1]]);
    expect(mergeArtistProfile(result, incoming, 'merge')).toEqual(result);
    expect(mergeArtistProfile({ ...current, biography: null }, incoming, 'merge').biography).toBe(
      incoming.biography,
    );
    expect(mergeArtistProfile(current, incoming, 'replace')).toEqual(incoming);
  });
});
