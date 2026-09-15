import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const dagoyanMaster = {
  cardId: 'dagoyan-master',
  name: 'Dagoyan Master',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Force'],
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'search-deck',
              count: 5,
              filter: 'unit',
              max: 1,
              trait: 'Force',
            },
          ],
        },
      ],
    },
    {
      id: 'when-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'search-deck',
              count: 5,
              filter: 'unit',
              max: 1,
              trait: 'Force',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
