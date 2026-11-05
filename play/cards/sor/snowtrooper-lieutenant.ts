import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSnowtrooperLieutenant = {
  cardId: 'snowtrooper-lieutenant',
  name: 'Snowtrooper Lieutenant',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 2,
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
                    trait: 'Imperial',
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
