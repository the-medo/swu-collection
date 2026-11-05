import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAdmiralAckbarBrilliantStrategist = {
  cardId: 'admiral-ackbar--brilliant-strategist',
  name: 'Admiral Ackbar, Brilliant Strategist',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Official'],
  cost: 3,
  unique: true,
  power: 1,
  hp: 4,
  arena: 'ground',
  restore: 1,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: {
                kind: 'unit-count',
                filter: {
                  controller: 'friendly',
                  sameArenaAs: 'chosen',
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
