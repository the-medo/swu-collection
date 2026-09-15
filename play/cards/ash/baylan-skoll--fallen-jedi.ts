import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-phase.json.
export const baylanSkollFallenJedi = {
  cardId: 'baylan-skoll--fallen-jedi',
  name: 'Baylan Skoll, Fallen Jedi',
  kind: 'unit',
  aspects: ['Aggression', 'Cunning', 'Villainy'],
  traits: ['Force'],
  unique: true,
  cost: 6,
  power: 6,
  hp: 6,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'phase-event',
            event: 'enemy-base-was-damaged',
          },
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
                    kind: 'give-token',
                    token: 'advantage',
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          kind: 'if',
          condition: {
            kind: 'phase-event',
            event: 'friendly-upgrade-defeated',
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'exhaust',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'phase-event',
            event: 'enemy-base-was-damaged',
          },
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
                    kind: 'give-token',
                    token: 'advantage',
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          kind: 'if',
          condition: {
            kind: 'phase-event',
            event: 'friendly-upgrade-defeated',
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'exhaust',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
