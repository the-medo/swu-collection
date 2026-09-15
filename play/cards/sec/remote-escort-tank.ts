import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const remoteEscortTank = {
  cardId: 'remote-escort-tank',
  name: 'Remote Escort Tank',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Republic', 'Vehicle', 'Tank'],
  cost: 6,
  power: 5,
  hp: 5,
  arena: 'ground',
  keywords: ['Plot'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: false,
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
