import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const twoFacedTroig = {
  cardId: 'two-faced-troig',
  name: 'Two-Faced Troig',
  kind: 'unit',
  aspects: ['Cunning', 'Vigilance'],
  traits: ['Underworld'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'give-control',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'take-control',
                    player: 'enemy',
                  },
                  ifYouDo: [
                    {
                      kind: 'create-credits',
                      amount: 2,
                    },
                  ],
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
