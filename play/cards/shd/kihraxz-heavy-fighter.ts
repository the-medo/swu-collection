import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKihraxzHeavyFighter = {
  cardId: 'kihraxz-heavy-fighter',
  name: 'Kihraxz Heavy Fighter',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 3,
  arena: 'space',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
            exhausted: false,
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
              ifYouDo: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'modify',
                    power: 3,
                    hp: 0,
                    duration: 'attack',
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
