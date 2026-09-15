import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const fettSFiresprayInPursuit = {
  cardId: 'fett-s-firespray--in-pursuit',
  name: "Fett's Firespray, In Pursuit",
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'space',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'defeat-credit',
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
              kind: 'create-credits',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
