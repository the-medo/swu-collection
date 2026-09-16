import { hmwUnit } from './define.ts';

export const hmwCrosshairIVeChanged = hmwUnit('crosshair--i-ve-changed', {
  triggers: [
    {
      id: 'survived',
      timing: 'friendly-damage-survived',
      condition: { kind: 'unit-matches', target: 'subject', filter: { sameAs: 'source' } },
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
          player: 'self',
        },
        {
          kind: 'draw-cards',
          amount: 1,
          player: 'enemy',
        },
      ],
    },
    {
      id: 'enemy-draw',
      timing: 'enemy-cards-drawn',
      condition: {
        kind: 'phase',
        phase: 'action',
      },
      effects: [
        {
          kind: 'damage-bases',
          amount: 2,
          targets: 'enemy',
        },
      ],
    },
  ],
});
