import type { CardInstance, GameState } from './model.ts';
import { triggerDefinitions } from './triggers.ts';
export function repeatedBounty(state: GameState, playerId: string, index: number | undefined) {
  const t = index === undefined ? undefined : state.usedBounties[index];
  if (
    !t ||
    t.playerId !== playerId ||
    !triggerDefinitions(state, t.source, t.abilities).some(
      a => a.id === t.abilityId && a.timing === 'bounty',
    )
  )
    throw new Error('Invalid collected Bounty');
  return t;
}
export function validBountyContext(
  state: GameState,
  source: CardInstance,
  playerId: string,
  index: number | undefined,
) {
  if (index === undefined) return false;
  const t = repeatedBounty(state, playerId, index);
  return JSON.stringify(source) === JSON.stringify(t.source);
}
