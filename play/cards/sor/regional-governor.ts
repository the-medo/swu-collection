import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRegionalGovernor = {
  cardId: 'regional-governor',
  name: 'Regional Governor',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Imperial', 'Official'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'name-card',
          bind: 'named',
          effects: [
            {
              kind: 'restrict-named-card',
              name: 'named',
              restriction: 'prevent-play',
              duration: 'source-in-play',
              appliesTo: 'enemy',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
