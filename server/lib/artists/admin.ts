import { randomUUID } from 'node:crypto';
import { count } from 'drizzle-orm';
import type { db as database } from '../../db';
import { artist, artistAlias, artistLink } from '../../db/schema/artist.ts';
import {
  artistExportSchema,
  MAX_ARTIST_EXPORT_BYTES,
  type ArtistExport,
  type ArtistTransferApplyInput,
  type ArtistTransferPreview,
  type ArtistTransferPreviewInput,
  type ArtistTransferStatus,
} from '../../../shared/types/artistTransfer.ts';
import { exportArtistProfiles, importArtistProfiles, parseArtistExport } from './transfer.ts';
import { ArtistTransferError } from './errors.ts';
import type { ArtistSnapshotStorage } from './storage.ts';

export class ArtistTransferAdmin {
  constructor(
    private db: typeof database,
    private storage: ArtistSnapshotStorage,
  ) {}

  async status(): Promise<ArtistTransferStatus> {
    const [profiles, links, aliases] = await Promise.all([
      this.db.select({ count: count() }).from(artist),
      this.db.select({ count: count() }).from(artistLink),
      this.db.select({ count: count() }).from(artistAlias),
    ]);
    return {
      database: { profiles: profiles[0].count, links: links[0].count, aliases: aliases[0].count },
      storage: this.storage.status(),
    };
  }
  list() {
    return this.storage.list();
  }
  export() {
    return exportArtistProfiles(this.db);
  }

  async publish(input?: ArtistExport) {
    const payload = input ? artistExportSchema.parse(input) : await this.export();
    const bytes = Buffer.from(JSON.stringify(payload, null, 2) + '\n');
    if (bytes.byteLength > MAX_ARTIST_EXPORT_BYTES)
      throw new ArtistTransferError('Artist snapshot exceeds 10 MiB.', 413);
    const uploadedAt = new Date().toISOString();
    const key = `artist-profiles/${uploadedAt.replace(/[:.]/g, '-')}-${randomUUID()}.json`;
    await this.storage.put(key, bytes);
    return { key, uploadedAt, bytes: bytes.byteLength };
  }
  private async source(source: ArtistTransferPreviewInput['source']) {
    const { bytes, sha256 } = await this.storage.get(source.key);
    try {
      return { payload: parseArtistExport(bytes, sha256), sha256 };
    } catch {
      throw new ArtistTransferError('The snapshot contains invalid artist data.', 400);
    }
  }
  async preview(input: ArtistTransferPreviewInput): Promise<ArtistTransferPreview> {
    const { payload, sha256 } = await this.source(input.source);
    const result = await importArtistProfiles(this.db, payload, { apply: false, mode: input.mode });
    return {
      ...input,
      sha256,
      expectedState: result.stateHash,
      exportedAt: payload.exportedAt,
      summary: {
        profiles: payload.artists.length,
        links: payload.artists.reduce((sum, profile) => sum + profile.links.length, 0),
        aliases: payload.version === 2 ? payload.aliases.length : 0,
      },
      changes: result.changes,
      aliasChanges: result.aliasChanges,
    };
  }
  async apply(input: ArtistTransferApplyInput) {
    const { payload, sha256 } = await this.source(input.source);
    if (sha256 !== input.sha256)
      throw new ArtistTransferError(
        'The snapshot changed since the preview. Preview the import again.',
        409,
      );
    const result = await importArtistProfiles(this.db, payload, {
      apply: true,
      mode: input.mode,
      expectedState: input.expectedState,
    });
    return { changes: result.changes, aliasChanges: result.aliasChanges };
  }
}
