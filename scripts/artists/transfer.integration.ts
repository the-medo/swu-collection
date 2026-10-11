// ARTIST_TRANSFER_TEST=1 bun --env-file=.env --env-file=.env.worktree scripts/artists/transfer.integration.ts
import { expect } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { artist, artistAlias, artistLink } from '../../server/db/schema/artist.ts';
import {
  artistExportChecksum,
  exportArtistProfiles,
  importArtistProfiles,
  type ArtistExport,
} from '../../server/lib/artists/transfer.ts';

import { ArtistTransferAdmin } from '../../server/lib/artists/admin.ts';
import type { ArtistSnapshotStorage } from '../../server/lib/artists/storage.ts';

const url = new URL(process.env.DATABASE_URL!);
if (
  process.env.ARTIST_TRANSFER_TEST !== '1' ||
  url.hostname !== '127.0.0.1' ||
  !url.pathname.startsWith('/swubase_')
) {
  throw new Error('Expected isolated worktree database and ARTIST_TRANSFER_TEST=1');
}
const client = postgres(url.toString(), { max: 1 });
const db = drizzle({ client });
const prefix = `transfer-test-${randomUUID()}`;
const keys = [`${prefix}-a`, `${prefix}-b`, `${prefix}-c`];
const input: ArtistExport = {
  format: 'swubase-artist-profiles',
  version: 1,
  exportedAt: new Date().toISOString(),
  artists: [
    {
      key: keys[0],
      name: 'Test artist',
      biography: null,
      links: [{ label: 'Portfolio', url: 'https://example.com/art' }],
    },
  ],
};
try {
  const preview = await importArtistProfiles(db, input, { apply: false, mode: 'merge' });
  expect(preview.changes[0].action).toBe('create');
  expect(await db.select().from(artist).where(eq(artist.key, keys[0]))).toHaveLength(0);
  await importArtistProfiles(db, input, { apply: true, mode: 'merge' });
  expect(
    (await importArtistProfiles(db, input, { apply: true, mode: 'merge' })).changes[0].action,
  ).toBe('unchanged');
  let [saved] = await db.select().from(artist).where(eq(artist.key, keys[0]));
  await db
    .update(artist)
    .set({ name: 'Production name', biography: 'Production biography' })
    .where(eq(artist.id, saved.id));
  const updated = structuredClone(input);
  updated.artists[0].biography = 'Dev biography';
  updated.artists[0].links.push({ label: 'Shop', url: 'https://example.com/shop' });
  await importArtistProfiles(db, updated, { apply: true, mode: 'merge' });
  let exported = (await exportArtistProfiles(db)).artists.find(profile => profile.key === keys[0])!;
  expect(exported.name).toBe('Production name');
  expect(exported.biography).toBe('Production biography');
  expect(exported.links).toHaveLength(2);

  await db.insert(artist).values({ key: keys[1], name: 'Untouched', biography: 'Preserved' });
  await importArtistProfiles(db, input, { apply: true, mode: 'replace' });
  exported = (await exportArtistProfiles(db)).artists.find(profile => profile.key === keys[0])!;
  expect(exported).toEqual(input.artists[0]);
  expect((await db.select().from(artist).where(eq(artist.key, keys[1])))[0].biography).toBe(
    'Preserved',
  );

  const aliasesBefore = await db.select().from(artistAlias);
  const v2: ArtistExport = {
    ...input,
    version: 2,
    artists: keys.map(key => ({ ...input.artists[0], key })),
    aliases: [{ key: keys[1], canonicalKey: keys[0] }],
  };
  expect(
    (await importArtistProfiles(db, v2, { apply: false, mode: 'merge' })).aliasChanges,
  ).toHaveLength(1);
  expect(await db.select().from(artistAlias).where(eq(artistAlias.key, keys[1]))).toHaveLength(0);
  await importArtistProfiles(db, v2, { apply: true, mode: 'merge' });
  expect(
    (await importArtistProfiles(db, v2, { apply: true, mode: 'merge' })).aliasChanges,
  ).toHaveLength(0);
  const aliasExport = await exportArtistProfiles(db);
  expect(
    aliasExport.version === 2 &&
      aliasExport.aliases.some(alias => alias.key === keys[1] && alias.canonicalKey === keys[0]),
  ).toBe(true);
  await expect(
    importArtistProfiles(
      db,
      { ...v2, aliases: [{ key: keys[1], canonicalKey: keys[2] }] },
      { apply: true, mode: 'merge' },
    ),
  ).rejects.toThrow('already belongs');
  await expect(
    importArtistProfiles(
      db,
      { ...v2, aliases: [{ key: keys[2], canonicalKey: keys[1] }] },
      { apply: true, mode: 'merge' },
    ),
  ).rejects.toThrow('not another alias');
  // Legacy replacements have no alias semantics and must preserve relationships.
  await importArtistProfiles(
    db,
    { ...input, artists: [{ ...input.artists[0], key: keys[1] }] },
    { apply: true, mode: 'replace' },
  );
  expect(await db.select().from(artistAlias).where(eq(artistAlias.key, keys[1]))).toHaveLength(1);
  const reassigned = { ...v2, aliases: [{ key: keys[1], canonicalKey: keys[2] }] };
  expect(
    (await importArtistProfiles(db, reassigned, { apply: false, mode: 'replace' })).aliasChanges,
  ).toEqual(reassigned.aliases);
  expect(
    (await db.select().from(artistAlias).where(eq(artistAlias.key, keys[1])))[0].canonicalKey,
  ).toBe(keys[0]);
  await importArtistProfiles(db, reassigned, { apply: true, mode: 'replace' });
  expect(
    (await db.select().from(artistAlias).where(eq(artistAlias.key, keys[1])))[0].canonicalKey,
  ).toBe(keys[2]);
  // A replacement cannot turn the target of an untouched alias into another alias.
  await expect(
    importArtistProfiles(
      db,
      {
        ...v2,
        artists: v2.artists.filter(profile => profile.key !== keys[1]),
        aliases: [{ key: keys[2], canonicalKey: keys[0] }],
      },
      { apply: true, mode: 'replace' },
    ),
  ).rejects.toThrow('not another alias');

  const snapshot = await exportArtistProfiles(db);
  if (snapshot.version !== 2) throw new Error('Expected alias export format');
  const fixtureExport = {
    ...snapshot,
    artists: snapshot.artists.filter(profile => keys.includes(profile.key)),
    aliases: snapshot.aliases.filter(alias => keys.includes(alias.key)),
  };
  await db.delete(artist).where(inArray(artist.key, keys));
  await importArtistProfiles(db, fixtureExport, { apply: true, mode: 'merge' });
  const restored = await exportArtistProfiles(db);
  expect(restored.artists.filter(profile => keys.includes(profile.key))).toEqual(
    fixtureExport.artists,
  );
  expect(
    restored.version === 2 && restored.aliases.filter(alias => keys.includes(alias.key)),
  ).toEqual(fixtureExport.aliases);
  [saved] = await db.select().from(artist).where(eq(artist.key, keys[0]));
  await importArtistProfiles(
    db,
    { ...v2, artists: [{ ...input.artists[0], key: keys[1] }], aliases: [] },
    { apply: true, mode: 'replace' },
  );
  expect(await db.select().from(artistAlias)).toHaveLength(aliasesBefore.length);
  await db.delete(artist).where(eq(artist.key, keys[2]));

  // The admin workflow binds the apply step to both the reviewed source and DB state.
  const objects = new Map<string, Uint8Array>();
  const storage: ArtistSnapshotStorage = {
    status: () => ({ configured: true, bucket: 'fixture' }),
    list: async () => ({ snapshots: [] }),
    put: async (key, bytes) => {
      objects.set(key, bytes);
    },
    get: async key => {
      const bytes = objects.get(key)!;
      return { bytes, sha256: artistExportChecksum(bytes) };
    },
  };
  const service = new ArtistTransferAdmin(db, storage);
  const published = await service.publish(input);
  expect(published.key).toMatch(/^artist-profiles\/.*\.json$/);
  const selection = {
    source: { kind: 'r2' as const, key: published.key },
    mode: 'replace' as const,
  };
  const reviewed = await service.preview(selection);
  const confirmation = {
    ...selection,
    sha256: reviewed.sha256,
    expectedState: reviewed.expectedState,
  };
  await db.update(artist).set({ biography: 'Concurrent edit' }).where(eq(artist.key, keys[0]));
  await expect(service.apply(confirmation)).rejects.toThrow('Artist data changed');
  expect((await db.select().from(artist).where(eq(artist.key, keys[0])))[0].biography).toBe(
    'Concurrent edit',
  );
  const fresh = await service.preview(selection);
  const freshConfirmation = {
    ...selection,
    sha256: fresh.sha256,
    expectedState: fresh.expectedState,
  };
  await expect(service.apply({ ...freshConfirmation, mode: 'merge' })).rejects.toThrow(
    'Artist data changed',
  );
  const bytes = objects.get(published.key)!;
  objects.set(
    published.key,
    Buffer.from(JSON.stringify({ ...input, exportedAt: '2026-01-01T00:00:00Z' })),
  );
  await expect(service.apply(freshConfirmation)).rejects.toThrow('snapshot changed');
  objects.set(published.key, bytes);
  await service.apply(freshConfirmation);
  expect((await db.select().from(artist).where(eq(artist.key, keys[0])))[0].biography).toBeNull();
  await expect(service.apply(freshConfirmation)).rejects.toThrow('Artist data changed');
  expect((await service.status()).storage.configured).toBe(true);

  // A later profile exceeding the merged limit must roll back earlier writes.
  await db.insert(artistLink).values(
    Array.from({ length: 50 }, (_, position) => ({
      artistId: saved.id,
      label: `Link ${position}`,
      url: `https://example.com/${position}`,
      position: position + 1,
    })),
  );
  const failing = { ...input, artists: [{ ...input.artists[0], key: keys[2] }, input.artists[0]] };
  await expect(importArtistProfiles(db, failing, { apply: true, mode: 'merge' })).rejects.toThrow(
    keys[0],
  );
  expect(await db.select().from(artist).where(eq(artist.key, keys[2]))).toHaveLength(0);
  await db.delete(artistLink).where(eq(artistLink.artistId, saved.id));
  await db.insert(artistLink).values({
    artistId: saved.id,
    label: 'Invalid manual edit',
    url: 'javascript:alert(1)',
    position: 0,
  });
  await expect(exportArtistProfiles(db)).rejects.toThrow(keys[0]);
  console.log(
    'Artist transfer: dry-run, roundtrip, idempotency, additive merge, scoped replacement, aliases, v1 compatibility and atomic rollback passed.',
  );
} finally {
  await db.delete(artist).where(inArray(artist.key, keys));
  await client.end();
}
