import { unitStats } from './attachments.ts';
import { activeLasting, survivesZeroHp } from './lasting.ts';
import type { CardInstance, GameState } from './model.ts';

// Keep damage, maintenance and saved play-payment reconstruction identical.
export function remainingHpRecord(
  state: GameState,
  card: CardInstance,
  playerId: string | null,
): NonNullable<CardInstance['remainingHpChange']> {
  const remaining = unitStats(state, card).hp - card.damage;
  const sourceBonuses = activeLasting(state, card)
    .filter(effect => effect.expires.kind === 'source-in-play' && effect.hp > 0)
    .map(effect => ({ id: effect.id, hp: effect.hp }));
  return {
    remaining,
    playerId,
    ...(remaining <= 0 && survivesZeroHp(state, card) ? { survived: true } : {}),
    ...(sourceBonuses.length ? { sourceBonuses } : {}),
  };
}
