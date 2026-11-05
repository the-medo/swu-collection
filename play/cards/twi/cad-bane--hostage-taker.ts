import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCadBaneHostageTaker = {
  cardId: 'cad-bane--hostage-taker',
  name: 'Cad Bane, Hostage Taker',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 7,
  unique: true,
  power: 7,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-units',
          filter: {
            controller: 'enemy',
            nonLeader: true,
          },
          bind: 'prisoners',
          min: 0,
          max: 3,
          effects: [
            {
              kind: 'capture-group',
              guard: 'source',
              group: 'prisoners',
            },
          ],
          remainingHpBudget: 8,
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-captured',
          bind: 'captive',
          optional: true,
          effects: [
            {
              kind: 'rescue-captured',
              target: 'captive',
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 2,
                },
              ],
            },
          ],
          guard: 'source',
          owner: 'enemy',
          chooser: 'enemy',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
