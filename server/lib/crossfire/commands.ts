import { IllegalInput, inputSchema } from '../../../play/engine/model.ts';
import type { DurableGame } from '../../../play/host/durable-game.ts';
import { stateDigest, StorageError } from '../../../play/storage/postgres.ts';
import type { Projector } from '../../../play/projection/projector.ts';
import { viewCommandSchema, WIRE_VERSION } from '../../../play/view/wire.ts';
import { AdmissionError } from './lobbies.ts';
import { ConnectionError, requireConnection } from './connections.ts';
import type { ConnectionGrant, CrossfireConnections } from './connections.ts';

async function permitted(check: () => Promise<unknown>): Promise<boolean> {
  try {
    await check();
    return true;
  } catch (error) {
    if (error instanceof AdmissionError || error instanceof ConnectionError) return false;
    // Database faults are not permission denials: the host must pause if the
    // commit outcome is uncertain, and callers must not publish speculative data.
    throw error;
  }
}

/** Worker entrypoint for an authenticated command. The grant comes exclusively
 * from ticket redemption. Wire intent must first be resolved through that
 * connection's viewer handles; it must never supply raw private engine IDs. */
export async function submitConnectedCommand(
  host: DurableGame,
  connections: CrossfireConnections,
  rawGrant: ConnectionGrant,
  commandId: string,
  raw: unknown,
) {
  const grant = structuredClone(rawGrant);
  const input = inputSchema.parse(raw);
  if (
    grant.role !== 'player' ||
    grant.purpose !== 'live' ||
    input.type === 'random' ||
    input.gameId !== grant.gameId ||
    input.playerId !== grant.seat
  )
    throw new StorageError('not-authorized');
  return host.submit(grant.seat, commandId, input, {
    check: () => permitted(() => connections.revalidate(grant)),
    commit: tx => permitted(() => requireConnection(tx, grant, true)),
  });
}

/** Network entrypoint: retry identity belongs to the validated original wire
 * command, including its old epoch. A receipt must be usable after reconnect
 * even when that connection's opaque options can no longer be translated. */
export async function submitConnectedViewCommand(
  host: DurableGame,
  connections: CrossfireConnections,
  rawGrant: ConnectionGrant,
  projector: Projector,
  commandId: string,
  raw: unknown,
) {
  const grant = structuredClone(rawGrant);
  const command = viewCommandSchema.parse(raw);
  if (grant.role !== 'player' || grant.purpose !== 'live' || command.gameId !== grant.gameId)
    throw new StorageError('not-authorized');
  const requestHash = stateDigest(
    JSON.stringify({ kind: 'view-command', wireVersion: WIRE_VERSION, command }),
  );
  return host.submitProjected(
    grant.seat,
    commandId,
    requestHash,
    state => projector.command(state, command),
    {
      check: () => permitted(() => connections.revalidate(grant)),
      commit: tx => permitted(() => requireConnection(tx, grant, true)),
    },
  );
}

/** Concession has no card/decision handles and is legal during either player's turn.
 * Resolve the engine revision server-side; public view revisions are independent. */
export async function submitConnectedConcession(
  host: DurableGame,
  connections: CrossfireConnections,
  rawGrant: ConnectionGrant,
  commandId: string,
) {
  const grant = structuredClone(rawGrant);
  if (grant.role !== 'player' || grant.purpose !== 'live') throw new StorageError('not-authorized');
  return host.submitProjected(
    grant.seat,
    commandId,
    stateDigest(JSON.stringify({ kind: 'concede', wireVersion: WIRE_VERSION })),
    state => ({
      type: 'concede',
      gameId: grant.gameId,
      playerId: grant.seat,
      expectedRevision: state.revision,
    }),
    {
      check: () => permitted(() => connections.revalidate(grant)),
      commit: tx => permitted(() => requireConnection(tx, grant, true)),
    },
  );
}

export class HandRevealRateLimitError extends Error {}
// Keep the budget with the loaded game, so replacing a socket cannot reset it.
const revealBudgets = new WeakMap<DurableGame, Map<string, number[]>>();

/** A player can grant/revoke access to their own hand, independent of whose turn it is. */
export async function submitConnectedHandReveal(
  host: DurableGame,
  connections: CrossfireConnections,
  rawGrant: ConnectionGrant,
  commandId: string,
  revealed: boolean,
) {
  const grant = structuredClone(rawGrant);
  if (grant.role !== 'player' || grant.purpose !== 'live' || typeof revealed !== 'boolean')
    throw new StorageError('not-authorized');
  return host.submitProjected(
    grant.seat,
    commandId,
    stateDigest(JSON.stringify({ kind: 'set-hand-reveal', wireVersion: WIRE_VERSION, revealed })),
    state => {
      const current =
        state.disclosure.revealedHands?.[grant.seat] ?? state.disclosure.handsToPlayers;
      if (current === revealed) throw new IllegalInput();
      // Limit new attempts, including failed commits; durable retries above recover their receipt.
      // Concealing is never rate-limited, so consent can always be withdrawn.
      if (revealed) {
        const budget = revealBudgets.get(host) ?? new Map<string, number[]>();
        const now = Date.now();
        const recent = (budget.get(grant.seat) ?? []).filter(at => now - at < 30_000);
        if (recent.length >= 3) throw new HandRevealRateLimitError();
        budget.set(grant.seat, [...recent, now]);
        revealBudgets.set(host, budget);
      }
      return {
        type: 'set-hand-reveal',
        gameId: grant.gameId,
        playerId: grant.seat,
        expectedRevision: state.revision,
        revealed,
      };
    },
    {
      check: () => permitted(() => connections.revalidate(grant)),
      commit: tx => permitted(() => requireConnection(tx, grant, true)),
    },
  );
}
