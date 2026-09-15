import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const drainEssence = {
  cardId: 'drain-essence',
  name: 'Drain Essence',
  kind: 'event',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force'],
  cost: 2,
  effects: [
    {
      kind: 'damage-unit',
      amount: 2,
      arena: 'any',
      optional: false,
    },
    {
      kind: 'gain-force',
    },
  ],
} as const satisfies EventDefinition;
