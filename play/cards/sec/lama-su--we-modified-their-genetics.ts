import type { LeaderDefinition } from '../definition.ts';

// Printed faces and revised official text are pinned in leader-reactions.json.
export const lamaSuWeModifiedTheirGenetics = {
  cardId: 'lama-su--we-modified-their-genetics',
  name: 'Lama Su, We Modified Their Genetics',
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Kaminoan', 'Official'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                playAs: 'upgrade',
              },
              attachFilter: {
                controller: 'friendly',
                withoutTrait: 'Vehicle',
              },
              discount: 1,
              optional: false,
              bindHost: 'host',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'host',
                  operation: {
                    kind: 'damage',
                    amount: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'attack-ended',
          effects: [
            {
              kind: 'play-card',
              from: 'discard',
              filter: {
                playAs: 'upgrade',
              },
              attachFilter: {
                controller: 'friendly',
                withoutTrait: 'Vehicle',
              },
              discount: 1,
              optional: false,
            },
          ],
          condition: {
            kind: 'value-at-least',
            name: 'survived',
            amount: 1,
          },
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
