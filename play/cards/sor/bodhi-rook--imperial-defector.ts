import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBodhiRookImperialDefector = {
  cardId: 'bodhi-rook--imperial-defector',
  name: 'Bodhi Rook, Imperial Defector',
  kind: 'unit',
  aspects: ['Cunning', 'Cunning'],
  traits: ['Imperial', 'Rebel'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'self',
          filter: {
            notKind: 'unit',
          },
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
