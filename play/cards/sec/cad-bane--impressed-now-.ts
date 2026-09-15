import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const cadBaneImpressedNow = {
  cardId: 'cad-bane--impressed-now-',
  name: 'Cad Bane, Impressed Now?',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'ground',
  keywords: ['Plot'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'defeat-unit',
          filter: {
            remainingHpAtMost: 2,
          },
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
