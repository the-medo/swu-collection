import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const baylanSkollEnigmaticMaster = {
  cardId: 'baylan-skoll--enigmatic-master',
  name: 'Baylan Skoll, Enigmatic Master',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force', 'Fringe'],
  unique: true,
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  keywords: ['Hidden'],
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
              kind: 'select-unit',
              filter: {
                nonLeader: true,
                maxCost: 4,
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'return-to-hand',
                  },
                },
                {
                  kind: 'play-card',
                  from: 'hand',
                  player: 'owner',
                  target: 'chosen',
                  filter: {},
                  free: true,
                  optional: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
