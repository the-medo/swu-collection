import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRushClovisBankingClanScion = {
  cardId: 'rush-clovis--banking-clan-scion',
  name: 'Rush Clovis, Banking Clan Scion',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Separatist', 'Official'],
  cost: 4,
  unique: true,
  power: 3,
  hp: 5,
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
            kind: 'numeric-equal',
            left: {
              kind: 'ready-resources',
              player: 'enemy',
            },
            right: 0,
          },
          effects: [
            {
              kind: 'create-unit',
              cardId: 'battle-droid',
              count: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
