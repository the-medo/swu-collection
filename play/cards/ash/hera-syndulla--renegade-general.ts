import type { UnitDefinition } from '../definition.ts';

// Text is pinned in meta-attack-outcomes; v8 end-of-attack timing applies.
export const heraSyndullaRenegadeGeneral = {
  cardId: 'hera-syndulla--renegade-general',
  name: 'Hera Syndulla, Renegade General',
  aspects: ['Vigilance', 'Aggression', 'Heroism'],
  traits: ['New Republic', "Twi'lek", 'Spectre'],
  cost: 3,
  power: 3,
  hp: 4,
  kind: 'unit',
  arena: 'ground',
  triggers: [
    {
      id: 'heal-combat-damage',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'combat-base-damage',
            amount: 1,
          },
          effects: [
            {
              kind: 'heal-own-base',
              amount: {
                kind: 'value',
                name: 'combat-base-damage',
              },
            },
          ],
        },
      ],
    },
  ],
  unique: true,
} as const satisfies UnitDefinition;
