import type { UnitDefinition } from '../definition.ts';
// ASH 110; v8 §8.26.8 carries the space-unit restriction into every free play.
export const admiralAckbarAssumeAttackCoordinates = {
  cardId: 'admiral-ackbar--assume-attack-coordinates',
  name: 'Admiral Ackbar, Assume Attack Coordinates',
  kind: 'unit',
  unique: true,
  cost: 5,
  power: 6,
  hp: 6,
  arena: 'ground',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Official'],
  triggers: [
    {
      id: 'played-search-fleet',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'defeat-ackbar',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: { kind: 'defeat' },
                  ifYouDo: [
                    {
                      kind: 'search-deck',
                      count: 10,
                      filter: 'unit',
                      arena: 'space',
                      max: 10,
                      maxTotalCost: 5,
                      play: { discount: 0, free: true },
                    },
                  ],
                },
              ],
            },
            { id: 'keep-ackbar', effects: [] },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
