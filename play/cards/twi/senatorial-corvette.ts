import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSenatorialCorvette = {
  cardId: 'senatorial-corvette',
  name: 'Senatorial Corvette',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Republic', 'Vehicle', 'Capital Ship'],
  cost: 5,
  power: 5,
  hp: 4,
  arena: 'space',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
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
} as const satisfies UnitDefinition;
