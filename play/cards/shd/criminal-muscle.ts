import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCriminalMuscle = {
  cardId: 'criminal-muscle',
  name: 'Criminal Muscle',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
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
          kind: 'select-upgrades',
          filter: {
            unique: false,
          },
          min: 0,
          max: 1,
          bind: 'upgrades',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'upgrades',
              to: 'hand',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
