import type { UnitDefinition } from '../definition.ts';

// SEC 133. Printed text and rulings are pinned in meta-disclose fixture.
export const syrilKarnWhereIsHe = {
  cardId: 'syril-karn--where-is-he-',
  name: 'Syril Karn, Where Is He?',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Official'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  unique: true,
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Aggression', 'Aggression', 'Villainy'],
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'hand',
                  player: 'bound-controller',
                  ownerOf: 'chosen',
                  chooser: 'owner',
                  filter: {},
                  min: 0,
                  max: 1,
                  bind: 'discarded',
                  effects: [
                    {
                      kind: 'move-card',
                      discardBy: 'owner',
                      target: 'discarded',
                      from: 'hand',
                      to: 'discard',
                    },
                  ],
                  otherwise: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: 2,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
