import type { UnitDefinition } from '../definition.ts';

// Text is pinned in meta-attack-outcomes; v8 end-of-attack timing applies.
export const oggdoBogdoBoganoBrute = {
  cardId: 'oggdo-bogdo--bogano-brute',
  name: 'Oggdo Bogdo, Bogano Brute',
  aspects: ['Vigilance'],
  traits: ['Creature'],
  cost: 3,
  power: 5,
  hp: 5,
  kind: 'unit',
  arena: 'ground',
  cannotAttackUndamaged: true,
  triggers: [
    {
      id: 'heal-after-defeat',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'defender-defeated',
            amount: 1,
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'heal',
                amount: 2,
              },
            },
          ],
        },
      ],
    },
  ],
  unique: true,
} as const satisfies UnitDefinition;
