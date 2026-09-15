import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const watchful = {
  cardId: 'watchful',
  name: 'Watchful',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Learned'],
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 2,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'choose-mode',
            options: [
              {
                id: 'look-self',
                effects: [
                  {
                    kind: 'look-deck',
                    player: 'self',
                    count: 1,
                    mode: 'bottom-any',
                  },
                ],
              },
              {
                id: 'look-enemy',
                effects: [
                  {
                    kind: 'look-deck',
                    player: 'enemy',
                    count: 1,
                    mode: 'bottom-any',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
