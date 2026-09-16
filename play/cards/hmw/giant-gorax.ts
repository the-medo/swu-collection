import { hmwUnit } from './define.ts';

const choice = {
  kind: 'choose-mode' as const,
  chooser: 'enemy' as const,
  options: [
    {
      id: 'damage',
      effects: [
        {
          kind: 'select-target' as const,
          units: { controller: 'enemy' as const },
          bases: 'enemy' as const,
          bind: 'target',
          optional: false,
          effects: [{ kind: 'damage-target' as const, target: 'target', amount: 3 }],
        },
      ],
    },
    {
      id: 'discard-and-defeat-resource',
      effects: [
        {
          kind: 'inspect-zone' as const,
          zone: 'hand' as const,
          player: 'enemy' as const,
          chooser: 'owner' as const,
          filter: {},
          min: 1,
          max: 1,
          bind: 'discarded',
          effects: [
            {
              kind: 'move-card' as const,
              target: 'discarded',
              fromPlayer: 'enemy' as const,
              from: 'hand' as const,
              to: 'discard' as const,
              discardBy: 'owner' as const,
            },
          ],
        },
        {
          kind: 'select-resources' as const,
          player: 'enemy' as const,
          chooser: 'owner' as const,
          exhausted: 'any' as const,
          min: 1,
          max: 1,
          operation: 'defeat' as const,
        },
      ],
    },
  ],
};

export const hmwGiantGorax = hmwUnit('giant-gorax', {
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      condition: { kind: 'controls-base-trait', trait: 'Endor' },
      effects: [choice],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      condition: { kind: 'controls-base-trait', trait: 'Endor' },
      effects: [choice],
    },
  ],
});
