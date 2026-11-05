import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBoKatanKryzeFightingForMandalore = {
  cardId: 'bo-katan-kryze--fighting-for-mandalore',
  name: 'Bo-Katan Kryze, Fighting For Mandalore',
  kind: 'unit',
  aspects: ['Aggression', 'Aggression'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 2,
  unique: true,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'base-damage-at-least',
            amount: 15,
            player: 'self',
          },
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
        },
        {
          kind: 'if',
          condition: {
            kind: 'base-damage-at-least',
            amount: 15,
            player: 'enemy',
          },
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
