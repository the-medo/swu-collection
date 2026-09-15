import { minimumDeckSize } from '../engine/state.ts';
import { z } from 'zod';
import { catalogFor, assertCompatibleVersions } from '../cards/catalog.ts';
import { bundleVersionsSchema, type BundleVersions } from '../cards/version-contract.ts';
import { versions } from '../engine/model.ts';
import { stateDigest } from '../storage/postgres.ts';

export type OfficialIdentityCatalog = Readonly<Record<string, { type: string } | undefined>>;
const cardId = z.string().min(1).max(120);
const rows = z
  .array(z.strictObject({ cardId, quantity: z.number().int().min(1).max(120) }))
  .max(600);
export const deckInputSchema = z.strictObject({
  source: z.strictObject({
    deckId: z.uuid(),
    format: z.number().int().positive(),
    kind: z.enum(['normal', 'limited']),
  }),
  leader: cardId.nullable(),
  leader2: cardId.nullable(),
  base: cardId.nullable(),
  mainboard: rows,
  sideboard: rows,
  reserve: rows,
});
export type DeckInput = z.infer<typeof deckInputSchema>;
import type { CrossfireDeckIssue as DeckIssue } from '../../shared/types/crossfire.ts';
export type { CrossfireDeckIssue as DeckIssue } from '../../shared/types/crossfire.ts';

function normalized(rows: DeckInput['mainboard']) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.cardId, (counts.get(row.cardId) ?? 0) + row.quantity);
  return [...counts]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([cardId, quantity]) => ({ cardId, quantity }));
}
function freeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
}

/** Official catalog identity is supplied by the API's official-only provider.
 * The catalog bundle supplies behavior; unknown/preview main cards never fall
 * back to vanilla. Source identifiers and hashes remain private admission data. */
export function prepareDeckSnapshot(
  raw: unknown,
  catalog: OfficialIdentityCatalog,
  format: string,
  gameVersions: BundleVersions = versions,
) {
  assertCompatibleVersions(gameVersions);
  const definitions = new Map(
    catalogFor({ versions: gameVersions }).data.cards.map(card => [card.cardId, card]),
  );
  const parsed = deckInputSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false as const, issues: [{ code: 'invalid-input' } satisfies DeckIssue] };
  const input = parsed.data;
  const issues: DeckIssue[] = [];
  if (format !== versions.format) issues.push({ code: 'unsupported-format' });
  if (input.leader2) issues.push({ code: 'leader-count' });
  const type = (id: string) => (Object.hasOwn(catalog, id) ? catalog[id]?.type : undefined);
  function validate(id: string | null, zone: string, role?: 'Leader' | 'Base') {
    if (!id) {
      issues.push({ code: 'missing-card', zone });
      return;
    }
    const printed = type(id);
    if (!printed) {
      issues.push({ code: 'unknown-card', cardId: id, zone });
      return;
    }
    if (role ? printed !== role : !['Unit', 'Event', 'Upgrade'].includes(printed)) {
      issues.push({ code: 'wrong-role', cardId: id, zone });
      return;
    }
    const definition = definitions.get(id);
    if (!definition) issues.push({ code: 'unsupported-card', cardId: id, zone });
    else if (
      (role && definition.kind !== role.toLowerCase()) ||
      (!role && !['unit', 'event', 'upgrade'].includes(definition.kind)) ||
      ((definition.kind === 'unit' || definition.kind === 'upgrade') && definition.token)
    )
      issues.push({ code: 'wrong-role', cardId: id, zone });
  }
  validate(input.leader, 'leader', 'Leader');
  validate(input.base, 'base', 'Base');
  const mainboard = normalized(input.mainboard);
  const sideboard = normalized(input.sideboard);
  const reserve = normalized(input.reserve);
  for (const row of mainboard) validate(row.cardId, 'mainboard');
  const count = mainboard.reduce((total, row) => total + row.quantity, 0);
  if (
    count <
      (input.base && definitions.get(input.base)?.kind === 'base'
        ? minimumDeckSize({ versions: gameVersions }, input.base)
        : 6) ||
    count > 120
  )
    issues.push({ code: 'deck-size' });
  if (
    (input.source.kind === 'limited' && sideboard.length) ||
    (input.source.kind === 'normal' && reserve.length)
  )
    issues.push({ code: 'invalid-input' });
  // Inactive cards cannot be selected during this one-game practice format.
  // Preserve their support report; switching them into play requires revalidation.
  const inactiveUnsupported = [
    ...new Set(
      [...sideboard, ...reserve]
        .filter(
          row =>
            !definitions.has(row.cardId) ||
            !['Unit', 'Event', 'Upgrade'].includes(type(row.cardId) ?? ''),
        )
        .map(row => row.cardId),
    ),
  ].sort();
  if (issues.length) return { ok: false as const, issues };
  const identity = Object.entries(catalog)
    .filter(([, card]) => card)
    .map(([cardId, card]) => [cardId, card!.type])
    .sort(([a], [b]) => (a! < b! ? -1 : a! > b! ? 1 : 0));
  const content = {
    snapshotVersion: 1 as const,
    versions: { ...gameVersions },
    catalogIdentityHash: stateDigest(JSON.stringify(identity)),
    sourceFormat: input.source.format,
    sourceKind: input.source.kind,
    leader: input.leader!,
    base: input.base!,
    mainboard,
    sideboard,
    reserve,
    inactiveUnsupported,
  };
  return {
    ok: true as const,
    snapshot: freeze({
      ...content,
      sourceDeckId: input.source.deckId,
      contentHash: stateDigest(JSON.stringify(content)),
    }),
  };
}

export type DeckSnapshot = Extract<
  ReturnType<typeof prepareDeckSnapshot>,
  { ok: true }
>['snapshot'];

/** Validate persisted input against its pinned card bundle. */
export function decodeDeckSnapshot(raw: unknown, catalog: OfficialIdentityCatalog): DeckSnapshot {
  const snapshot = z
    .object({
      snapshotVersion: z.literal(1),
      sourceDeckId: z.uuid(),
      sourceFormat: z.number().int().positive(),
      sourceKind: z.enum(['normal', 'limited']),
      leader: cardId,
      base: cardId,
      mainboard: rows,
      sideboard: rows,
      reserve: rows,
      contentHash: z.string().regex(/^[a-f0-9]{64}$/),
      versions: bundleVersionsSchema,
      catalogIdentityHash: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .parse(raw);
  const result = prepareDeckSnapshot(
    {
      source: {
        deckId: snapshot.sourceDeckId,
        format: snapshot.sourceFormat,
        kind: snapshot.sourceKind,
      },
      leader: snapshot.leader,
      leader2: null,
      base: snapshot.base,
      mainboard: snapshot.mainboard,
      sideboard: snapshot.sideboard,
      reserve: snapshot.reserve,
    },
    catalog,
    snapshot.versions.format,
    snapshot.versions,
  );
  if (!result.ok) throw new Error('Crossfire deck snapshot is incompatible or corrupted');
  // New official identities must not invalidate an older match. Validate its
  // cards against their pinned implementation, retaining the recorded catalog
  // identity digest inside the original content hash.
  const candidate = { ...result.snapshot, catalogIdentityHash: snapshot.catalogIdentityHash };
  const { sourceDeckId: _source, contentHash: _hash, ...content } = candidate;
  candidate.contentHash = stateDigest(JSON.stringify(content));
  if (
    candidate.contentHash !== snapshot.contentHash ||
    stateDigest(JSON.stringify(candidate)) !== stateDigest(JSON.stringify(raw))
  )
    throw new Error('Crossfire deck snapshot is incompatible or corrupted');
  return freeze(candidate);
}
