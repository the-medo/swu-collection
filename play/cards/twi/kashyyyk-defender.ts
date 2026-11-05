import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKashyyykDefender = {
  cardId: 'kashyyyk-defender',
  name: 'Kashyyyk Defender',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Wookiee'],
  cost: 2,
  power: 0,
  hp: 5,
  arena: 'ground',
  keywords: ['Grit'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'distribute',
              benefit: 'heal',
              amount: 2,
              filter: {
                sameAs: 'chosen',
              },
              bind: 'healed',
              effects: [
                {
                  kind: 'damage-target',
                  target: 'source',
                  amount: {
                    kind: 'value',
                    name: 'healed',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
