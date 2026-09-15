import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const relentlessFirespray = {
  cardId: 'relentless-firespray',
  name: 'Relentless Firespray',
  kind: 'unit',
  aspects: ['Aggression', 'Aggression'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'ready-on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'ready',
          },
        },
      ],
      limit: 'once-per-round',
    },
  ],
} as const satisfies UnitDefinition;
