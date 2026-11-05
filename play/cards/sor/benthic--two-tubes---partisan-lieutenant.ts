import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBenthicTwoTubesPartisanLieutenant = {
  cardId: 'benthic--two-tubes---partisan-lieutenant',
  name: 'Benthic "Two Tubes", Partisan Lieutenant',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Rebel', 'Trooper'],
  cost: 1,
  unique: true,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            anyAspect: ['Aggression'],
            otherThan: 'source',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  raid: 2,
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
