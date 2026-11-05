import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteResoluteUnderAnakinSCommand = {
  cardId: 'resolute--under-anakin-s-command',
  name: "Resolute, Under Anakin's Command",
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Republic', 'Vehicle', 'Capital Ship'],
  cost: 10,
  unique: true,
  power: 8,
  hp: 8,
  arena: 'space',
  costReductions: [
    {
      condition: {
        kind: 'always',
      },
      amount: {
        kind: 'own-base-damage',
        divisor: 5,
      },
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
            controller: 'enemy',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-units',
              amount: 2,
              filter: {
                controller: 'enemy',
                sameNameAs: 'chosen',
              },
            },
          ],
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-units',
              amount: 2,
              filter: {
                controller: 'enemy',
                sameNameAs: 'chosen',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
