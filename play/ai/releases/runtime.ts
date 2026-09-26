import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { decodeDeckSnapshot, prepareDeckSnapshot } from '../../admission/decks.ts';
import { canonicalJson } from '../../cards/catalog.ts';
import type { AiRelease, AiVersions } from '../../../shared/types/crossfire-ai-releases.ts';
import { makeEncoding } from '../full-game/encoding.ts';
import { AiError, sha256 } from './objects.ts';

/** Reconstruct precisely the published feature contract, even when the live
 * opponent uses a deck that never appeared in the training roster. */
export function releaseRuntime(release: AiRelease, deckKey: string, versions: AiVersions) {
  const advertised = release.decks.find(d => d.key === deckKey);
  if (!advertised || !release.deckSnapshots?.[deckKey])
    throw new AiError('Release needs an immutable playable decklist');
  const original = decodeDeckSnapshot(release.deckSnapshots[deckKey], {});
  if (original.contentHash !== advertised.hash || original.leader !== release.leader.cardId)
    throw new AiError('Published deck does not match the evaluated model');
  const contract = z
    .object({
      protocol: z.literal(1),
      commandAdapter: z.literal(1),
      encoding: z
        .object({
          version: z.union([z.literal(1), z.literal(2)]),
          vocabulary: z.array(z.string()).min(1).max(4096),
        })
        .passthrough(),
      decks: z
        .array(z.object({ key: z.string(), hash: z.string() }))
        .min(2)
        .max(32),
      specialists: z.unknown().optional(),
    })
    .parse(release.contract);
  const deckIndex = contract.decks.findIndex(d => d.key === deckKey && d.hash === advertised.hash);
  if (deckIndex < 0) throw new AiError('Published deck is outside the model contract');
  const encoding = makeEncoding(
    contract.decks.map(d => ({ key: d.key, snapshot: original })),
    contract.encoding.version === 2,
    contract.encoding.vocabulary,
  );
  if (!isDeepStrictEqual(encoding.encodingContract, contract.encoding))
    throw new AiError('Unsupported AI feature interface');
  const fingerprint = Object.fromEntries(
    ['protocol', 'commandAdapter', 'encoding', 'specialists'].map(key => [
      key,
      release.contract[key] ?? null,
    ]),
  );
  if (sha256(canonicalJson(fingerprint)) !== release.interfaceHash)
    throw new AiError('AI feature interface checksum mismatch');
  const prepared = prepareDeckSnapshot(
    {
      source: {
        deckId: original.sourceDeckId,
        format: original.sourceFormat,
        kind: original.sourceKind,
      },
      leader: original.leader,
      leader2: null,
      base: original.base,
      mainboard: original.mainboard,
      sideboard: original.sideboard,
      reserve: original.reserve,
    },
    Object.fromEntries(original.cardIdentities?.map(c => [c.cardId, { type: c.type }]) ?? []),
    versions.format,
    versions,
  );
  if (!prepared.ok) throw new AiError('AI deck is incompatible with this game target');
  return { snapshot: prepared.snapshot, encoding, deckIndex };
}
