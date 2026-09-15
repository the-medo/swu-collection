import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 attack mechanics fixture.
export const flashTheVents = {
  cardId: 'flash-the-vents',
  name: 'Flash the Vents',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Gambit'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: 2,
          abilities: { keywords: ['Overwhelm'] },
          after: [
            {
              kind: 'if',
              condition: {
                kind: 'value-at-least',
                name: 'attacker-damaged-base',
                amount: 1,
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'defeat',
                  },
                },
              ],
            },
          ],
        },
      ],
      forAttack: {},
    },
  ],
} as const satisfies EventDefinition;
