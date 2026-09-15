import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const warriorOfClanOrdo = {
  cardId: 'warrior-of-clan-ordo',
  name: 'Warrior of Clan Ordo',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Mandalorian'],
  cost: 2,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'disclose-or-damage',
      timing: 'attack',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Aggression'],
          effects: [],
          otherwise: [
            {
              kind: 'damage-own-base',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
