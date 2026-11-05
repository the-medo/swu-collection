import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteK2SoCassianSCounterpart = {
  cardId: 'k-2so--cassian-s-counterpart',
  name: "K-2SO, Cassian's Counterpart",
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Droid'],
  cost: 4,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'damage',
              effects: [
                {
                  kind: 'damage-bases',
                  targets: 'enemy',
                  amount: 3,
                },
              ],
            },
            {
              id: 'discard',
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'hand',
                  player: 'enemy',
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
    },
  ],
} as const satisfies UnitDefinition;
