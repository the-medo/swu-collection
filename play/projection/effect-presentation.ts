import type { CardEffect } from '../cards/definition.ts';
import type { Frame } from '../engine/model.ts';

// Describe only the current instruction. Never serialize execution frames or
// private bindings to the browser to explain a target choice.
export function effectPresentation(
  frame: Frame | undefined,
): { title: string; text: string } | undefined {
  if (frame?.kind !== 'effect') return;
  const effect = frame.effect;
  const damage = (amount: unknown) => (typeof amount === 'number' ? `${amount} damage` : 'damage');
  const targetEffect = (effects: readonly CardEffect[], bind: string) => {
    // Keep printed text for compound instructions rather than omitting a cost,
    // restriction, or another part of the chosen target's effect.
    if (effects.length !== 1) return;
    for (const next of effects) {
      if (next.kind === 'damage-target' && next.target === bind)
        return {
          title: 'Choose a damage target',
          text: `Deal ${damage(next.amount)} to the chosen target.`,
        };
      if (next.kind !== 'on-unit' || next.target !== bind) continue;
      const op = next.operation;
      if (op.kind === 'give-token') {
        const token =
          { shield: 'Shield', experience: 'Experience', advantage: 'Advantage' }[op.token] ??
          op.token;
        return {
          title: `Give ${token}`,
          text: `Give ${typeof op.count !== 'number' ? 'the indicated number of' : op.count === 1 ? (token === 'Experience' || token === 'Advantage' ? 'an' : 'a') : op.count} ${token} token${op.count === 1 ? '' : 's'} to a unit.`,
        };
      }
      if (
        op.kind === 'modify' &&
        typeof op.power === 'number' &&
        typeof op.hp === 'number' &&
        Object.keys(op).every(key => ['kind', 'power', 'hp', 'duration'].includes(key))
      ) {
        const sign = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`;
        const filter =
          effect.kind === 'select-unit' && effect.filter.powerLessThan === 'any-friendly'
            ? ' with less power than a friendly unit'
            : '';
        const duration =
          op.duration === 'source-in-play'
            ? 'while the source remains in play'
            : op.duration === 'next-regroup'
              ? 'until the next regroup phase'
              : `for this ${op.duration}`;
        return {
          title: 'Choose a unit to modify',
          text: `Choose a unit${filter}. It gets ${sign(op.power)}/${sign(op.hp)} ${duration}.`,
        };
      }
      if (op.kind === 'ready' || op.kind === 'exhaust' || op.kind === 'defeat')
        return {
          title: `Choose a unit to ${op.kind}`,
          text: `${op.kind[0]!.toUpperCase()}${op.kind.slice(1)} the chosen unit.`,
        };
    }
  };
  switch (effect.kind) {
    case 'heal-base':
      return { title: 'Choose a base to heal', text: `Heal ${effect.amount} damage from a base.` };
    case 'heal-unit':
      return { title: 'Choose a unit to heal', text: `Heal ${effect.amount} damage from a unit.` };
    case 'damage-base':
      return { title: 'Choose a base to damage', text: `Deal ${effect.amount} damage to a base.` };
    case 'damage-units':
      return {
        title: 'Choose units to damage',
        text: `Deal ${damage(effect.amount)} to each chosen unit.`,
      };
    case 'select-unit':
    case 'select-target':
      return targetEffect(effect.effects, effect.bind);
    case 'select-resources':
      return {
        title: `Choose resources to ${effect.operation}`,
        text: `${effect.operation[0]!.toUpperCase()}${effect.operation.slice(1)} the selected resources.`,
      };
    default:
      return;
  }
}
