import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteChewbaccaPykesbane = {
  cardId: 'chewbacca--pykesbane',
  name: 'Chewbacca, Pykesbane',
  kind: 'unit',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Underworld', 'Wookiee'],
  cost: 8,
  unique: true,
  power: 4,
  hp: 10,
  arena: 'ground',
  keywords: ['Grit'],
  smuggle: [
    {
      id: 'smuggle',
      cost: 9,
      aspects: ['Aggression', 'Heroism'],
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            remainingHpAtMost: 5,
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'defeat',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
