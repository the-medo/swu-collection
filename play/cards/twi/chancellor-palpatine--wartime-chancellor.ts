import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteChancellorPalpatineWartimeChancellor = {
  cardId: 'chancellor-palpatine--wartime-chancellor',
  name: 'Chancellor Palpatine, Wartime Chancellor',
  kind: 'unit',
  aspects: ['Cunning', 'Cunning'],
  traits: ['Republic', 'Official'],
  cost: 4,
  unique: true,
  power: 2,
  hp: 6,
  arena: 'ground',
  friendlyTokenUnitsEnterReady: true,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-history-at-least',
            event: 'left',
            player: 'any',
            amount: 1,
          },
          effects: [
            {
              kind: 'create-unit',
              cardId: 'clone-trooper',
              count: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
