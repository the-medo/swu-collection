import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const summaVerminoth = {
  cardId: 'summa-verminoth',
  name: 'Summa-verminoth',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Creature'],
  cost: 12,
  power: 15,
  hp: 15,
  arena: 'space',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'defeat-units',
          filter: {
            arena: 'space',
            otherThan: 'source',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
