import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 attack mechanics fixture.
export const oneWayOut = {
  cardId: 'one-way-out',
  name: 'One Way Out',
  kind: 'event',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Gambit'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: 1,
          abilities: { keywords: ['Overwhelm'] },
          blankDefender: true,
        },
      ],
      forAttack: {},
    },
  ],
} as const satisfies EventDefinition;
