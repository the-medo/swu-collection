import type { UnitDefinition } from '../definition.ts';

// LOF 160. Printed text is pinned in meta-hidden-zones fixture.
export const merrinAloneWithTheDead = {
  cardId: 'merrin--alone-with-the-dead',
  name: 'Merrin, Alone with the Dead',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Force', 'Night'],
  cost: 3,
  unique: true,
  power: 2,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 0,
          max: 1,
          bind: 'chosen-card',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen-card',
              from: 'hand',
              to: 'discard',
              effects: [
                {
                  kind: 'damage-unit',
                  amount: 2,
                  optional: false,
                  arena: 'any',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
