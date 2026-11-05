import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGentleGiant = {
  cardId: 'gentle-giant',
  name: 'Gentle Giant',
  kind: 'unit',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Wookiee'],
  cost: 6,
  power: 2,
  hp: 8,
  arena: 'ground',
  keywords: ['Grit'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'heal-target',
              target: 'chosen',
              amount: {
                kind: 'unit-stat',
                target: 'source',
                stat: 'damage',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
