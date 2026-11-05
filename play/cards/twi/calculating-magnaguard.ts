import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCalculatingMagnaguard = {
  cardId: 'calculating-magnaguard',
  name: 'Calculating MagnaGuard',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Separatist', 'Droid'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            abilities: {
              keywords: ['Sentinel'],
            },
          },
        },
      ],
    },
    {
      id: 'friendly-defeated',
      timing: 'friendly-defeated',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            abilities: {
              keywords: ['Sentinel'],
            },
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
