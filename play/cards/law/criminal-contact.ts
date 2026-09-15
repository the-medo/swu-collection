import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const criminalContact = {
  cardId: 'criminal-contact',
  name: 'Criminal Contact',
  kind: 'unit',
  aspects: [],
  traits: ['Underworld'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 2,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'create-credits',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
