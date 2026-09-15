import type { UnitDefinition } from '../definition.ts';

// LAW 174. Printed text is pinned in meta-hidden-zones fixture.
export const card000TranslationAndTorture = {
  cardId: '0-0-0--translation-and-torture',
  name: '0-0-0, Translation and Torture',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Droid'],
  cost: 3,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'self',
          filter: {
            aspect: 'Aggression',
          },
          min: 0,
          max: 1,
          bind: 'chosen-card',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen-card',
              from: 'discard',
              to: 'deck-bottom',
              effects: [
                {
                  kind: 'damage-bases',
                  amount: 1,
                  targets: 'enemy',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
