import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-interactions.json.
export const uWingLander = {
  cardId: 'u-wing-lander',
  name: 'U-Wing Lander',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  cost: 5,
  power: 2,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'experience',
      timing: 'played',
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
    {
      id: 'transfer-upgrade',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            attachedTo: 'source',
          },
          min: 0,
          max: 1,
          bind: 'upgrade',
          effects: [
            {
              kind: 'reattach-upgrade',
              target: 'upgrade',
              filter: {
                controller: 'friendly',
                trait: 'Vehicle',
                otherThan: 'source',
              },
            },
          ],
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'survived',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
