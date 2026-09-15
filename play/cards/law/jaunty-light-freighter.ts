import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const jauntyLightFreighter = {
  cardId: 'jaunty-light-freighter',
  name: 'Jaunty Light Freighter',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Vehicle', 'Transport'],
  cost: 4,
  power: 1,
  hp: 1,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: {
              kind: 'unit-aspects',
              filter: {
                controller: 'friendly',
              },
            },
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
