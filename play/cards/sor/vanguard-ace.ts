import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteVanguardAce = {
  cardId: 'vanguard-ace',
  name: 'Vanguard Ace',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['New Republic', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 1,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: {
              kind: 'difference',
              left: {
                kind: 'cards-played-count',
                player: 'self',
              },
              right: 1,
            },
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
