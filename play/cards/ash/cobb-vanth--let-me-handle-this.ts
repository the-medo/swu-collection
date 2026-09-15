import type { UnitDefinition } from '../definition.ts';
export const cobbVanthLetMeHandleThis = {
  cardId: 'cobb-vanth--let-me-handle-this',
  name: 'Cobb Vanth, Let Me Handle This',
  kind: 'unit',
  unique: true,
  cost: 4,
  power: 2,
  hp: 6,
  arena: 'ground',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Official'],
  keywords: ['Grit'],
  triggers: [
    {
      id: 'shield-played-unit',
      timing: 'friendly-played',
      excludeSelf: true,
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'take-2-damage',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: { kind: 'damage', amount: 2 },
                  ifYouDo: [
                    {
                      kind: 'on-unit',
                      target: 'subject',
                      operation: { kind: 'give-token', token: 'shield', count: 1 },
                    },
                  ],
                },
              ],
            },
            { id: 'decline', effects: [] },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
