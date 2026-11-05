import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteZoriiBlissValiantSmuggler = {
  cardId: 'zorii-bliss--valiant-smuggler',
  name: 'Zorii Bliss, Valiant Smuggler',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld'],
  cost: 5,
  unique: true,
  power: 4,
  hp: 7,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 6,
      aspects: ['Cunning', 'Heroism'],
    },
  ],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
        {
          kind: 'schedule-regroup-effects',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'self',
              chooser: 'owner',
              filter: {},
              min: 1,
              max: 1,
              bind: 'card',
              effects: [
                {
                  kind: 'move-card',
                  target: 'card',
                  from: 'hand',
                  to: 'discard',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
