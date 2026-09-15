import type { Sql } from 'postgres';
import { ENGINE_VERSION, parseVersion, supportsEngine } from '../../../play/engine/release.ts';
import { canonicalJson, type CardCatalog } from '../../../play/cards/catalog.ts';
import {
  ACTIVE_CARD_BUNDLE,
  initializeCardBundles,
  activateCardBundle,
  loadCardBundle,
  CardBundleError,
} from '../../../play/storage/card-bundles.ts';
import {
  availableReleases,
  downloadRelease,
  releaseKey,
  type ReleaseObjects,
  ReleaseStorageError,
} from '../../../play/releases/storage.ts';
import type {
  CardReleaseSelection,
  CardReleaseStatus,
  CardReleasePreview,
  CardReleaseRow,
} from '../../../shared/types/crossfire-card-releases.ts';

export class CrossfireCardReleases {
  constructor(
    private readonly sql: Sql,
    private readonly objects: ReleaseObjects | null,
  ) {}
  async status(): Promise<CardReleaseStatus> {
    await initializeCardBundles(this.sql);
    const [active] = await this
      .sql`SELECT value FROM public.application_configuration WHERE key = ${ACTIVE_CARD_BUNDLE}`;
    const rows = await this
      .sql`SELECT version, checksum, required_engine, source_commit, created_at FROM play.card_bundles ORDER BY created_at DESC`;
    const releases: CardReleaseRow[] = rows.map(r => ({
      version: r.version,
      checksum: r.checksum,
      requiredEngine: r.required_engine,
      sourceCommit: r.source_commit,
      createdAt: r.created_at.toISOString(),
      installed: true,
      compatible: supportsEngine(r.required_engine),
    }));
    let remoteError: string | null = null;
    if (this.objects) {
      try {
        for (const remote of (await availableReleases(this.objects)).releases) {
          const installed = releases.find(r => r.version === remote.version);
          if (installed) {
            if (installed.checksum !== remote.checksum)
              remoteError = 'A published version conflicts with an installed bundle.';
            continue;
          }
          releases.push({
            version: remote.version,
            checksum: remote.checksum,
            requiredEngine: remote.requiredEngine,
            sourceCommit: remote.sourceCommit,
            createdAt: remote.publishedAt,
            installed: false,
            compatible: supportsEngine(remote.requiredEngine),
          });
        }
      } catch {
        remoteError = 'Could not check R2 for updates. Installed releases remain available.';
      }
    }
    releases.sort((a, b) => {
      const x = parseVersion(a.version),
        y = parseVersion(b.version);
      return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
    });
    return {
      engineVersion: ENGINE_VERSION,
      activeVersion: active!.value,
      remoteConfigured: this.objects !== null,
      remoteError,
      releases,
    };
  }
  private async resolve(selection: CardReleaseSelection) {
    await initializeCardBundles(this.sql);
    if (selection.source === 'installed') {
      const [row] = await this
        .sql`SELECT source_commit, r2_key, required_engine FROM play.card_bundles WHERE version = ${selection.version} AND checksum = ${selection.checksum}`;
      if (!row) throw new CardBundleError('The selected release is not installed');
      if (!supportsEngine(row.required_engine))
        throw new CardBundleError(
          'This release requires a newer or different major engine deployment',
        );
      return {
        catalog: await loadCardBundle(this.sql, `${selection.version}@${selection.checksum}`),
        sourceCommit: row.source_commit as string,
        r2Key: row.r2_key as string | null,
      };
    }
    if (!this.objects) throw new ReleaseStorageError('R2 card release storage is not configured');
    const release = (await availableReleases(this.objects)).releases.find(
      r => r.version === selection.version && r.checksum === selection.checksum,
    );
    if (!release)
      throw new CardBundleError(
        'The published release changed or is unavailable; check for updates',
      );
    if (!supportsEngine(release.requiredEngine))
      throw new CardBundleError(
        'This release requires a newer or different major engine deployment',
      );
    return {
      catalog: await downloadRelease(this.objects, release),
      sourceCommit: release.sourceCommit,
      r2Key: releaseKey(release),
    };
  }
  async preview(selection: CardReleaseSelection): Promise<CardReleasePreview> {
    const { catalog } = await this.resolve(selection);
    const [row] = await this
      .sql`SELECT b.version,b.checksum FROM public.application_configuration c JOIN play.card_bundles b ON b.version = c.value WHERE c.key = ${ACTIVE_CARD_BUNDLE}`;
    const current = await loadCardBundle(this.sql, `${row!.version}@${row!.checksum}`);
    return releaseDifference(current, catalog);
  }
  async activate(selection: CardReleaseSelection & { expectedActive: string }): Promise<void> {
    const release = await this.resolve(selection);
    await activateCardBundle(
      this.sql,
      release.catalog,
      release.sourceCommit,
      release.r2Key,
      selection.expectedActive,
    );
  }
}
export function releaseDifference(current: CardCatalog, next: CardCatalog): CardReleasePreview {
  const summarize = (c: { cardId: string; name: string }) => ({ cardId: c.cardId, name: c.name });
  return {
    version: next.data.version,
    checksum: next.hash,
    currentVersion: current.data.version,
    total: next.data.cards.length,
    added: next.data.cards.filter(c => !current.find(c.cardId)).map(summarize),
    changed: next.data.cards
      .filter(
        c => current.find(c.cardId) && canonicalJson(current.find(c.cardId)) !== canonicalJson(c),
      )
      .map(summarize),
    removed: current.data.cards.filter(c => !next.find(c.cardId)).map(summarize),
  };
}
