import { createHash } from 'node:crypto';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import type { db as database } from '../../db';
import { artist, artistAlias, artistLink } from '../../db/schema/artist.ts';

import {
  artistExportSchema,
  artistProfileSchema,
  validateArtistAliases,
  MAX_ARTIST_EXPORT_BYTES,
  type ArtistExport,
  type ArtistProfileData,
  type ArtistImportMode,
} from '../../../shared/types/artistTransfer.ts';
import { ArtistTransferError } from './errors.ts';
export {
  artistExportSchema,
  validateArtistAliases,
  MAX_ARTIST_EXPORT_BYTES,
} from '../../../shared/types/artistTransfer.ts';
export type {
  ArtistExport,
  ArtistProfileData,
  ArtistImportMode,
} from '../../../shared/types/artistTransfer.ts';

function validateArtistProfile(profile: ArtistProfileData): ArtistProfileData {
  const result = artistProfileSchema.safeParse(profile);
  if (!result.success) {
    const issues = result.error.issues
      .map(issue => `${issue.path.join('.') || 'profile'}: ${issue.message}`)
      .join('; ');
    throw new ArtistTransferError(`Invalid artist profile "${profile.key}": ${issues}`, 400);
  }
  return result.data;
}

export const artistExportChecksum = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');

export function parseArtistExport(bytes: Uint8Array, expectedChecksum?: string): ArtistExport {
  if (bytes.byteLength > MAX_ARTIST_EXPORT_BYTES) throw new Error('Artist export exceeds 10 MiB');
  if (
    expectedChecksum &&
    (!/^[a-f0-9]{64}$/i.test(expectedChecksum) ||
      artistExportChecksum(bytes) !== expectedChecksum.toLowerCase())
  ) {
    throw new Error('Artist export SHA-256 does not match');
  }
  return artistExportSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
}

// Merge is deliberately additive: production edits survive a later snapshot import.
export function mergeArtistProfile(
  existing: ArtistProfileData | undefined,
  incoming: ArtistProfileData,
  mode: ArtistImportMode,
): ArtistProfileData {
  if (!existing || mode === 'replace') return incoming;
  const urls = new Set(existing.links.map(link => link.url));
  return {
    ...existing,
    biography: existing.biography || incoming.biography,
    links: [...existing.links, ...incoming.links.filter(link => !urls.has(link.url))],
  };
}

export async function exportArtistProfiles(db: typeof database): Promise<ArtistExport> {
  return db.transaction(
    async tx => {
      const profiles = await tx.select().from(artist).orderBy(asc(artist.key));
      const links = await tx
        .select()
        .from(artistLink)
        .orderBy(asc(artistLink.position), asc(artistLink.id));
      const aliases = await tx.select().from(artistAlias).orderBy(asc(artistAlias.key));
      return artistExportSchema.parse({
        format: 'swubase-artist-profiles',
        version: 2,
        aliases,
        exportedAt: new Date().toISOString(),
        artists: profiles.map(profile =>
          validateArtistProfile({
            key: profile.key,
            name: profile.name,
            biography: profile.biography,
            links: links
              .filter(link => link.artistId === profile.id)
              .map(({ label, url }) => ({ label, url })),
          }),
        ),
      });
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}

export async function importArtistProfiles(
  db: typeof database,
  input: ArtistExport,
  options: { apply: boolean; mode: ArtistImportMode; expectedState?: string },
) {
  const payload = artistExportSchema.parse(input);
  return db.transaction(async tx => {
    // Serialize artist transfers, including profiles which do not yet exist.
    await tx.execute(sql`select pg_advisory_xact_lock(739285101)`);
    const keys = payload.artists.map(profile => profile.key);
    const currentAliases = await tx.select().from(artistAlias);
    const incomingAliases = payload.version === 2 ? payload.aliases : [];
    const nextAliases = new Map(currentAliases.map(alias => [alias.key, alias]));
    if (payload.version === 2 && options.mode === 'replace') {
      for (const key of keys) nextAliases.delete(key);
    }
    for (const alias of incomingAliases) {
      const current = nextAliases.get(alias.key);
      if (current && current.canonicalKey !== alias.canonicalKey)
        throw new ArtistTransferError(
          `Artist alias "${alias.key}" already belongs to "${current.canonicalKey}"; use replacement mode to reassign it`,
          409,
        );
      nextAliases.set(alias.key, alias);
    }
    const allProfiles = await tx.select({ key: artist.key }).from(artist);
    try {
      validateArtistAliases(
        [...nextAliases.values()],
        new Set([...allProfiles.map(profile => profile.key), ...keys]),
      );
    } catch (error) {
      throw new ArtistTransferError((error as Error).message, 409);
    }
    const aliasChanges = [
      ...new Set([...currentAliases.map(alias => alias.key), ...nextAliases.keys()]),
    ].flatMap(key => {
      const current = currentAliases.find(alias => alias.key === key);
      const next = nextAliases.get(key);
      return current?.canonicalKey === next?.canonicalKey
        ? []
        : [{ key, canonicalKey: next?.canonicalKey ?? null }];
    });
    const existing = keys.length
      ? await tx.select().from(artist).where(inArray(artist.key, keys)).for('update')
      : [];
    const ids = existing.map(profile => profile.id);
    const existingLinks = ids.length
      ? await tx
          .select()
          .from(artistLink)
          .where(inArray(artistLink.artistId, ids))
          .orderBy(asc(artistLink.position), asc(artistLink.id))
      : [];
    const stateHash = artistExportChecksum(
      Buffer.from(
        JSON.stringify({
          mode: options.mode,
          payload,
          profiles: allProfiles.map(profile => profile.key).sort(),
          existing: [...existing].sort((a, b) => a.key.localeCompare(b.key)),
          links: existingLinks,
          aliases: [...currentAliases].sort((a, b) => a.key.localeCompare(b.key)),
        }),
      ),
    );
    if (options.expectedState && options.expectedState !== stateHash) {
      throw new ArtistTransferError(
        'Artist data changed since the preview. Preview the import again.',
        409,
      );
    }
    const changes: { key: string; action: 'create' | 'update' | 'unchanged'; links: number }[] = [];
    for (const incoming of payload.artists) {
      const current = existing.find(profile => profile.key === incoming.key);
      const currentLinks = existingLinks.filter(link => link.artistId === current?.id);
      const currentData = current
        ? {
            key: current.key,
            name: current.name,
            biography: current.biography,
            links: currentLinks.map(({ label, url }) => ({ label, url })),
          }
        : undefined;
      const merged = validateArtistProfile(mergeArtistProfile(currentData, incoming, options.mode));
      const action = !current
        ? 'create'
        : JSON.stringify(currentData) === JSON.stringify(merged)
          ? 'unchanged'
          : 'update';
      changes.push({ key: incoming.key, action, links: merged.links.length });
      if (!options.apply || action === 'unchanged') continue;

      const [saved] = await tx
        .insert(artist)
        .values({ key: merged.key, name: merged.name, biography: merged.biography })
        .onConflictDoUpdate({
          target: artist.key,
          set: { name: merged.name, biography: merged.biography, updatedAt: new Date() },
        })
        .returning({ id: artist.id });
      if (options.mode === 'replace') {
        await tx.delete(artistLink).where(eq(artistLink.artistId, saved.id));
      }
      const previousUrls = new Set(
        options.mode === 'replace' ? [] : currentLinks.map(link => link.url),
      );
      const nextPosition =
        options.mode === 'replace'
          ? 0
          : Math.max(-1, ...currentLinks.map(link => link.position)) + 1;
      const newLinks = merged.links.filter(link => !previousUrls.has(link.url));
      if (newLinks.length)
        await tx.insert(artistLink).values(
          newLinks.map((link, index) => ({
            ...link,
            artistId: saved.id,
            position: nextPosition + index,
          })),
        );
    }
    if (options.apply && aliasChanges.length) {
      await tx.delete(artistAlias).where(
        inArray(
          artistAlias.key,
          aliasChanges.map(alias => alias.key),
        ),
      );
      const additions = aliasChanges.filter(
        (alias): alias is { key: string; canonicalKey: string } => alias.canonicalKey !== null,
      );
      if (additions.length) await tx.insert(artistAlias).values(additions);
    }
    return { applied: options.apply, mode: options.mode, changes, aliasChanges, stateHash };
  });
}
