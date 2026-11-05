import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGladiatorStarDestroyer = {
  cardId: 'gladiator-star-destroyer',
  name: 'Gladiator Star Destroyer',
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 6,
  power: 5,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
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
                  keywords: ['Sentinel'],
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
