import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFightersForFreedom = {
  cardId: 'fighters-for-freedom',
  name: 'Fighters for Freedom',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Saboteur'],
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
          aspect: 'Aggression',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
