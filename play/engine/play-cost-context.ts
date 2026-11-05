import type { EffectContext } from './bindings.ts';
import type { CardReference, GameState } from './model.ts';
import { supportsEngine } from './release.ts';

// Admission, payment (including Credits/Exploit), and execution must evaluate a
// candidate-dependent discount against the same physical card.
export function withPlayCandidate(
  state: GameState,
  context: EffectContext,
  card: CardReference,
): EffectContext {
  return supportsEngine('1.5.0', state.versions.engine)
    ? { ...context, bindings: { ...context.bindings, candidate: card } }
    : context;
}
