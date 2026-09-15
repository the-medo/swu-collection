import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const savageOpressImbuedWithHate = {
  cardId: 'savage-opress--imbued-with-hate',
  name: 'Savage Opress, Imbued With Hate',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Night'],
  unique: true,
  cost: 6,
  power: 9,
  hp: 6,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [],
          otherwise: [
            {
              kind: 'damage-own-base',
              amount: 9,
            },
          ],
        },
      ],
    },
    {
      id: 'when-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [],
          otherwise: [
            {
              kind: 'damage-own-base',
              amount: 9,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
