import { isDeepStrictEqual } from 'node:util';
import type { RetainedEngine } from '../host/bundles.ts';
import { checkpointMetadata, stateDigest } from './postgres.ts';
import type { Recovery } from './postgres.ts';
import { verifyHistory } from '../history/records.ts';

/** Only the pinned executable interprets its opaque historical state. All hashes
 * and inputs stay private; this is recovery, not a browser replay response. */
export function recoverGame(runtime: RetainedEngine, stored: Recovery): unknown {
  const fail = () => {
    throw new Error('Crossfire recovery integrity mismatch');
  };
  if (
    !(
      runtime.supportsVersions?.(stored.versions) ??
      isDeepStrictEqual(runtime.versions, stored.versions)
    )
  )
    fail();
  if (stored.journal.some(entry => entry.control))
    return verifyHistory({ ...stored, summary: null }).state;
  const start = stored.checkpoint;
  if (stateDigest(start.checkpoint) !== start.stateHash) fail();
  const meta = checkpointMetadata(start.checkpoint);
  if (
    meta.gameId !== stored.gameId ||
    meta.revision !== start.revision ||
    !isDeepStrictEqual(meta.versions, stored.versions)
  )
    fail();
  let state = runtime.decodeState(start.checkpoint);
  let sequence = start.sequence;
  let revision = start.revision;
  let digest = start.stateHash;
  for (const entry of stored.journal) {
    if (entry.sequence !== ++sequence || entry.fromRevision !== revision) fail();
    const facts: unknown[] = [];
    for (const input of entry.inputs) {
      const result = runtime.advance(state, input);
      state = result.state;
      facts.push(...result.facts);
    }
    const checkpoint = runtime.encodeState(state);
    const next = checkpointMetadata(checkpoint);
    digest = stateDigest(checkpoint);
    revision = next.revision;
    if (
      next.gameId !== stored.gameId ||
      revision !== entry.revision ||
      digest !== entry.stateHash ||
      !isDeepStrictEqual(facts, entry.facts)
    )
      fail();
  }
  if (sequence !== stored.sequence || revision !== stored.revision || digest !== stored.stateHash)
    fail();
  return state;
}
