import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLadyProximaWhiteWormMatriarch = {
  cardId: 'lady-proxima--white-worm-matriarch',
  name: 'Lady Proxima, White Worm Matriarch',
  kind: 'unit',
  aspects: [],
  traits: ['Underworld'],
  cost: 1,
  unique: true,
  power: 0,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'friendly-card-played',
      timing: 'friendly-card-played',
      effects: [
        {
          kind: 'select-target',
          bases: 'any',
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 1,
            },
          ],
        },
      ],
      excludeSelf: true,
      condition: {
        kind: 'card-matches',
        target: 'subject',
        filter: {
          trait: 'Underworld',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
