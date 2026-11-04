import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetPrivateerScyk = {
  cardId: 'privateer-scyk',
  name: 'Privateer Scyk',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          anyAspect: ['Cunning'],
          otherThan: 'source',
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Shielded'],
      },
    },
  ],
} as const satisfies UnitDefinition;
