import type { UnitDefinition } from '../definition.ts';

// Official text is pinned in leader-smuggle.json.
export const privateerCrew = {
  cardId: 'privateer-crew',
  name: 'Privateer Crew',
  kind: 'unit',
  cost: 2,
  aspects: ['Command'],
  traits: ['Underworld'],
  smuggle: [
    {
      id: 'smuggle',
      cost: 6,
      aspects: ['Command'],
    },
  ],
  triggers: [
    {
      id: 'smuggle-experience',
      timing: 'played',
      condition: {
        kind: 'numeric-at-least',
        value: {
          kind: 'value',
          name: 'played-using-smuggle',
        },
        amount: 1,
      },
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: 3,
          },
        },
      ],
    },
  ],
  power: 2,
  hp: 2,
  arena: 'ground',
} as const satisfies UnitDefinition;
