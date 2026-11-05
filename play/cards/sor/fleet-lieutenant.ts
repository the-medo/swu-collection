import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFleetLieutenant = {
  cardId: 'fleet-lieutenant',
  name: 'Fleet Lieutenant',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              powerBonus: {
                kind: 'conditional',
                condition: {
                  kind: 'unit-matches',
                  target: 'chosen',
                  filter: {
                    trait: 'Rebel',
                  },
                },
                then: 2,
                otherwise: 0,
              },
            },
          ],
          forAttack: {},
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
