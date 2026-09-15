import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 control and timing fixture.
export const maulMasterOfTheShadowCollective = {
  cardId: 'maul--master-of-the-shadow-collective',
  name: 'Maul, Master of the Shadow Collective',
  kind: 'unit',
  aspects: ['Command', 'Aggression', 'Villainy'],
  traits: ['Force', 'Underworld'],
  unique: true,
  cost: 7,
  power: 6,
  hp: 8,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'claim-unit',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'source',
            filter: {},
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                nonLeader: true,
              },
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'take-control',
                    player: 'self',
                    returnWhen: 'source-leaves',
                  },
                },
              ],
            },
          ],
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'combat-opponent-base-damage',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
