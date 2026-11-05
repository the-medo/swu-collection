import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteInfernoFourUnforgetting = {
  cardId: 'inferno-four--unforgetting',
  name: 'Inferno Four, Unforgetting',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'look-deck',
          count: 2,
          mode: 'bottom-any',
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'look-deck',
          count: 2,
          mode: 'bottom-any',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
