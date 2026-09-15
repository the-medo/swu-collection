import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const timelyReinforcements = {
  cardId: 'timely-reinforcements',
  name: 'Timely Reinforcements',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 5,
  effects: [
    {
      kind: 'create-unit',
      cardId: 'x-wing',
      count: {
        kind: 'floor-divide',
        value: {
          kind: 'zone-size',
          zone: 'resources',
          player: 'enemy',
        },
        divisor: 2,
      },
      phaseAbilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies EventDefinition;
