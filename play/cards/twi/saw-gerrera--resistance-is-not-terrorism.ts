import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSawGerreraResistanceIsNotTerrorism = {
  cardId: 'saw-gerrera--resistance-is-not-terrorism',
  name: 'Saw Gerrera, Resistance is Not Terrorism',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Fringe', 'Trooper'],
  cost: 6,
  unique: true,
  power: 4,
  hp: 8,
  arena: 'ground',
  raid: 2,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'base-damage-at-least',
            amount: 15,
          },
          effects: [
            {
              kind: 'damage-units',
              amount: 1,
              filter: {
                controller: 'enemy',
                arena: 'ground',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
