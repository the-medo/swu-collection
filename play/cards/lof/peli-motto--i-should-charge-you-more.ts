import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const peliMottoIShouldChargeYouMore = {
  cardId: 'peli-motto--i-should-charge-you-more',
  name: 'Peli Motto, I Should Charge You More',
  kind: 'unit',
  aspects: [],
  traits: ['Fringe'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            anyTrait: ['Vehicle', 'Droid'],
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
