import { catalogFor } from '../../../play/cards/catalog.ts';
import { releaseRuntime } from '../../../play/ai/releases/runtime.ts';
import type { AiOpponent, AiModelPin } from '../../../shared/types/crossfire-ai-play.ts';
export type { AiModelPin } from '../../../shared/types/crossfire-ai-play.ts';
import { supportsEngine } from '../../../play/engine/release.ts';
import { randomUUID } from 'node:crypto';
import type { Sql } from 'postgres';
import { canonicalJson } from '../../../play/cards/catalog.ts';
import {
  activeCardVersions,
  initializeCardBundles,
  loadGameVersions,
} from '../../../play/storage/card-bundles.ts';
import {
  AiError,
  readRelease,
  readWeights,
  releaseIndex,
  sha256,
  publishRelease,
  type AiObjects,
} from '../../../play/ai/releases/objects.ts';
import type { AiInference } from '../../../play/ai/releases/inference.ts';
import {
  aiReleaseSchema,
  aiVersions,
  type AiActivation,
  type AiRelease,
  type AiReleasePreview,
  type AiReleaseStatus,
  type AiReleaseSummary,
  type AiSelection,
  type AiVersions,
} from '../../../shared/types/crossfire-ai-releases.ts';

export const targetHash = (target: AiVersions) => sha256(canonicalJson(target));
const sameTarget = (a: AiVersions, b: AiVersions) => targetHash(a) === targetHash(b);
export function eligible(release: AiRelease, target: AiVersions) {
  const report = release.evaluations.find(e => sameTarget(e.versions, target));
  // This is a minimum evidence gate, not a claim of expert-level play.
  return (
    release.games > 0 &&
    release.updates > 0 &&
    !!report &&
    report.cutoffs === 0 &&
    report.decisions > 0 &&
    release.decks.every(d => report.byDeck.some(row => row.deck === d.key && row.games >= 40))
  );
}
function summary(
  release: AiRelease,
  checksum: string,
  installed: boolean,
  target: AiVersions,
): AiReleaseSummary {
  const {
    contract: _,
    artifact: _artifact,
    datasets: _datasets,
    deckSnapshots: _decks,
    ...publicData
  } = release;
  return {
    ...publicData,
    checksum,
    installed,
    eligible: eligible(release, target),
    compatible: release.evaluations.some(e => sameTarget(e.versions, target)),
    playable: release.decks.every(d => !!release.deckSnapshots?.[d.key]),
  };
}

/** Model selections are independent per leader and exact certified game target. */
export class CrossfireAiReleases {
  private readonly manifests = new Map<string, { checksum: string; release: AiRelease }>();
  constructor(
    private readonly sql: Sql,
    private readonly objects: AiObjects | null,
    private readonly inference: AiInference | null,
  ) {}

  get configured() {
    return !!this.inference;
  }

  /** Import installs immutable bytes; activation remains a separate reviewed action. */
  async importRelease(raw: unknown, weights: Buffer): Promise<AiSelection> {
    const release = aiReleaseSchema.parse(raw);
    if (weights.length !== release.artifact.bytes || sha256(weights) !== release.artifact.sha256)
      throw new AiError('Model file does not match the release manifest');
    const versions = await this.versions();
    if (!eligible(release, versions))
      throw new AiError('Release lacks compatible evaluation evidence');
    for (const d of release.decks) await this.playableRuntime(release, d.key, versions);
    if (!this.inference) throw new AiError('AI inference service is not configured');
    await this.inference.load(release, weights);
    const selection = { id: release.id, checksum: sha256(canonicalJson(release)) };
    if (this.objects) await publishRelease(this.objects, release, weights);
    await this.sql.begin(async tx => {
      await tx`INSERT INTO play.ai_releases(id,checksum,leader_card_id,manifest,weights)
        VALUES (${release.id},${selection.checksum},${release.leader.cardId},${tx.json(release)},${weights}) ON CONFLICT DO NOTHING`;
      const [row] = await tx`SELECT checksum FROM play.ai_releases WHERE id=${release.id}`;
      if (row?.checksum !== selection.checksum) throw new AiError('Immutable release conflict');
    });
    return selection;
  }

  async opponents(versions: AiVersions): Promise<AiOpponent[]> {
    if (!this.inference) return [];
    const rows = await this
      .sql`SELECT r.manifest FROM play.ai_active a JOIN play.ai_releases r ON r.id=a.release_id
      WHERE a.target_hash=${targetHash(versions)} ORDER BY r.leader_card_id LIMIT 100`;
    const opponents: AiOpponent[] = [];
    for (const row of rows) {
      const release = aiReleaseSchema.parse(row.manifest);
      if (!eligible(release, versions)) continue;
      for (const deck of release.decks) {
        if (!release.deckSnapshots?.[deck.key]) continue;
        const { snapshot } = await this.playableRuntime(release, deck.key, versions);
        opponents.push({
          deckKey: deck.key,
          label: deck.label,
          leaderCardId: snapshot.leader,
          baseCardId: snapshot.base,
          archetypes: deck.archetypes,
          releaseId: release.id,
          releaseLabel: release.label,
          games: release.games,
        });
      }
    }
    return opponents;
  }

  private async playableRuntime(release: AiRelease, deckKey: string, target: AiVersions) {
    // The original snapshot must be verified against its own retained catalog,
    // even when admission is certified for a newer card/engine target.
    if (
      !(await loadGameVersions(this.sql, release.contract.versions)) ||
      !(await loadGameVersions(this.sql, target))
    )
      throw new AiError('A required playable model card/engine target is unavailable');
    try {
      return releaseRuntime(release, deckKey, target);
    } catch (error) {
      if (error instanceof AiError) throw error;
      throw new AiError('Published playable deck failed validation');
    }
  }

  async runtime(pin: AiModelPin) {
    const { release } = await this.installedManifest(pin.releaseId);
    if (
      release.artifact.sha256 !== pin.artifact ||
      release.interfaceHash !== pin.interfaceHash ||
      !eligible(release, pin.versions)
    )
      throw new AiError('AI game pin is invalid');
    return { ...(await this.playableRuntime(release, pin.deckKey, pin.versions)), release };
  }

  private async versions() {
    await initializeCardBundles(this.sql);
    return aiVersions.parse(await activeCardVersions(this.sql));
  }
  async status(): Promise<AiReleaseStatus> {
    const versions = await this.versions();
    const rows = await this
      .sql`SELECT id,checksum,manifest FROM play.ai_releases ORDER BY installed_at DESC LIMIT 100`;
    const releases = rows.map(r =>
      summary(aiReleaseSchema.parse(r.manifest), r.checksum, true, versions),
    );
    let remoteError: string | null = null;
    if (this.objects) {
      try {
        // Bound work per dashboard refresh. Installed history remains durable.
        const recent = (await releaseIndex(this.objects)).releases.slice(-100).reverse();
        for (let offset = 0; offset < recent.length; offset += 4) {
          const batch = await Promise.all(
            recent.slice(offset, offset + 4).map(async item => {
              const installed = releases.find(r => r.id === item.id);
              if (installed) {
                if (installed.checksum !== item.checksum)
                  throw new AiError('Release index conflicts with installed data');
                return null;
              }
              return summary(
                await readRelease(this.objects!, item),
                item.checksum,
                false,
                versions,
              );
            }),
          );
          releases.push(...batch.filter((r): r is AiReleaseSummary => r !== null));
        }
      } catch (error) {
        remoteError =
          error instanceof AiError
            ? error.message
            : 'Could not read the release index. Installed releases remain available.';
      }
    }
    const active = await this.sql`SELECT leader_card_id,target,release_id FROM play.ai_active`;
    const history = await this
      .sql`SELECT leader_card_id,release_id,previous_id,activated_at FROM play.ai_activations ORDER BY activated_at DESC LIMIT 100`;
    const datasets = { pending: 0, exported: 0, revoked: 0, failed: 0 };
    for (const row of await this
      .sql`SELECT state,count(*)::int AS count FROM play.ai_training_exports GROUP BY state`)
      if (row.state in datasets) datasets[row.state as keyof typeof datasets] = row.count;
    return {
      versions,
      remoteConfigured: !!this.objects,
      inferenceConfigured: !!this.inference,
      remoteError,
      releases: releases.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      active: active.map(r => ({
        leaderCardId: r.leader_card_id,
        target: aiVersions.parse(r.target),
        releaseId: r.release_id,
      })),
      history: history.map(r => ({
        leaderCardId: r.leader_card_id,
        releaseId: r.release_id,
        previousId: r.previous_id,
        at: r.activated_at.toISOString(),
      })),
      datasets,
      datasetFailures: (
        await this
          .sql`SELECT CASE WHEN error LIKE 'History quarantined:%' THEN 'history' ELSE 'storage' END AS category, count(*)::int AS count FROM play.ai_training_exports WHERE error IS NOT NULL GROUP BY 1`
      ).map(r => ({ category: r.category as 'history' | 'storage', count: r.count as number })),
    };
  }
  private async resolve(selection: AiSelection) {
    const [row] = await this
      .sql`SELECT checksum,manifest,weights FROM play.ai_releases WHERE id = ${selection.id}`;
    if (row) {
      if (row.checksum !== selection.checksum)
        throw new AiError('Installed release identity mismatch');
      const release = aiReleaseSchema.parse(row.manifest);
      const weights = Buffer.from(row.weights);
      if (
        sha256(canonicalJson(release)) !== selection.checksum ||
        weights.length !== release.artifact.bytes ||
        sha256(weights) !== release.artifact.sha256
      )
        throw new AiError('Installed release failed integrity validation');
      return { release, weights, installed: true };
    }
    if (!this.objects) throw new AiError('R2 model storage is not configured');
    if (
      !(await releaseIndex(this.objects)).releases.some(
        r => r.id === selection.id && r.checksum === selection.checksum,
      )
    )
      throw new AiError('Release is not in the published index');
    const release = await readRelease(this.objects, selection);
    return { release, weights: await readWeights(this.objects, release), installed: false };
  }
  private async installedManifest(id: string) {
    const cached = this.manifests.get(id);
    if (cached) return cached;
    const [row] = await this.sql`SELECT checksum,manifest FROM play.ai_releases WHERE id=${id}`;
    if (!row) throw new AiError('Pinned AI release is unavailable');
    const release = aiReleaseSchema.parse(row.manifest);
    if (sha256(canonicalJson(release)) !== row.checksum)
      throw new AiError('Installed manifest integrity mismatch');
    const value = { checksum: row.checksum as string, release };
    this.manifests.set(id, value);
    if (this.manifests.size > 64) this.manifests.delete(this.manifests.keys().next().value!);
    return value;
  }
  private async installedWeights(release: AiRelease) {
    const [row] = await this.sql`SELECT weights FROM play.ai_releases WHERE id=${release.id}`;
    if (!row) throw new AiError('Pinned AI release is unavailable');
    const weights = Buffer.from(row.weights);
    if (weights.length !== release.artifact.bytes || sha256(weights) !== release.artifact.sha256)
      throw new AiError('Installed weights integrity mismatch');
    return weights;
  }
  private async current(leader: string, versions: AiVersions) {
    const [row] = await this
      .sql`SELECT release_id FROM play.ai_active WHERE leader_card_id = ${leader} AND target_hash = ${targetHash(versions)}`;
    return (row?.release_id ?? null) as string | null;
  }
  async preview(selection: AiSelection): Promise<AiReleasePreview> {
    const versions = await this.versions();
    const { release, weights, installed } = await this.resolve(selection);
    const data = summary(release, selection.checksum, installed, versions);
    if (!data.eligible || !data.compatible)
      return {
        release: data,
        current: await this.current(release.leader.cardId, versions),
        versions,
        ready: false,
        message:
          'This target needs a trained checkpoint and at least 40 completed, replay-verified evaluation games per advertised deck, with no cutoffs.',
      };
    if (!this.inference)
      throw new AiError('Configure the private AI inference service before activation');
    await this.inference.load(release, weights);
    return {
      release: data,
      current: await this.current(release.leader.cardId, versions),
      versions,
      ready: true,
      message: 'Dependencies validated and loaded. Review the matchup results before activating.',
    };
  }
  async activate(selection: AiActivation, actorId: string) {
    const { release, weights } = await this.resolve(selection);
    if (
      !eligible(release, selection.versions) ||
      !(await loadGameVersions(this.sql, selection.versions)) ||
      !supportsEngine(
        catalogFor({ versions: selection.versions }).data.requiredEngine,
        selection.versions.engine,
      )
    )
      throw new AiError('Release is not qualified for this engine/card target');
    for (const deck of release.decks)
      if (release.deckSnapshots?.[deck.key])
        await this.playableRuntime(release, deck.key, selection.versions);
    if (!this.inference) throw new AiError('AI inference service is not configured');
    await this.inference.load(release, weights);
    const target = targetHash(selection.versions);
    await this.sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`ai-release:${release.leader.cardId}:${target}`}, 0))`;
      const [previous] =
        await tx`SELECT release_id FROM play.ai_active WHERE leader_card_id = ${release.leader.cardId} AND target_hash = ${target}`;
      if ((previous?.release_id ?? null) !== selection.expectedActive)
        throw new AiError('The active release changed. Refresh and review again.');
      await tx`INSERT INTO play.ai_releases (id,checksum,leader_card_id,manifest,weights) VALUES
        (${release.id},${selection.checksum},${release.leader.cardId},${tx.json(release)},${weights}) ON CONFLICT DO NOTHING`;
      const [installed] = await tx`SELECT checksum FROM play.ai_releases WHERE id = ${release.id}`;
      if (installed?.checksum !== selection.checksum)
        throw new AiError('Immutable release conflict');
      await tx`INSERT INTO play.ai_active (leader_card_id,target_hash,target,release_id) VALUES
        (${release.leader.cardId},${target},${tx.json(selection.versions)},${release.id})
        ON CONFLICT (leader_card_id,target_hash) DO UPDATE SET release_id=EXCLUDED.release_id,activated_at=now()`;
      await tx`INSERT INTO play.ai_activations (id,leader_card_id,target,release_id,previous_id,actor_id) VALUES
        (${randomUUID()},${release.leader.cardId},${tx.json(selection.versions)},${release.id},${selection.expectedActive},${actorId})`;
    });
  }
  /** The game host must persist this pin during admission; never resolve a default mid-game. */
  async pin(leaderCardId: string, deckKey: string, versions: AiVersions): Promise<AiModelPin> {
    const id = await this.current(leaderCardId, versions);
    if (!id) throw new AiError('No AI release is active for this leader and engine/card target');
    const [row] = await this.sql`SELECT checksum FROM play.ai_releases WHERE id = ${id}`;
    const { release, weights } = await this.resolve({ id, checksum: row!.checksum });
    if (!release.decks.some(d => d.key === deckKey) || !eligible(release, versions))
      throw new AiError('Unsupported AI deck');
    if (!this.inference) throw new AiError('AI inference service is not configured');
    await this.inference.load(release, weights);
    return {
      releaseId: id,
      artifact: release.artifact.sha256,
      interfaceHash: release.interfaceHash,
      deckKey,
      versions,
    };
  }
  async choose(pin: AiModelPin, observation: unknown) {
    if (!this.inference) throw new AiError('AI inference service is not configured');
    const { release } = await this.installedManifest(pin.releaseId);
    if (
      release.artifact.sha256 !== pin.artifact ||
      release.interfaceHash !== pin.interfaceHash ||
      !release.decks.some(d => d.key === pin.deckKey)
    )
      throw new AiError('AI game pin is invalid');
    try {
      return await this.inference.choose(release, pin.versions, pin.deckKey, observation);
    } catch (error) {
      if (!(error instanceof AiError) || error.message !== 'Pinned model needs reloading')
        throw error;
      await this.inference.load(release, await this.installedWeights(release));
      return this.inference.choose(release, pin.versions, pin.deckKey, observation);
    }
  }
}
