import type { EventDefinition } from '../definition.ts';

// JTL 181. Printed text is pinned in meta-force-indirect fixture.
export const planetaryBombardment = {
  cardId: 'planetary-bombardment',
  name: 'Planetary Bombardment',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 6,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'units-at-least',
        amount: 1,
        filter: {
          controller: 'friendly',
          trait: 'Capital Ship',
        },
      },
      effects: [
        {
          kind: 'indirect-damage',
          amount: 12,
          recipient: 'chosen',
        },
      ],
      otherwise: [
        {
          kind: 'indirect-damage',
          amount: 8,
          recipient: 'chosen',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
