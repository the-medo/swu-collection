import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const rookieRocketJumper = {
  cardId: 'rookie-rocket-jumper',
  name: 'Rookie Rocket-jumper',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', "Twi'lek"],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
