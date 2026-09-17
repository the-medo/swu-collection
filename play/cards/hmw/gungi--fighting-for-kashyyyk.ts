import { hmwUnit } from './define.ts';

export const hmwGungiFightingForKashyyyk = hmwUnit('gungi--fighting-for-kashyyyk', {
  keywords: ['Grit'],
  triggers: [
    {
      id: 'survived-damage',
      timing: 'friendly-damage-survived',
      condition: { kind: 'unit-matches', target: 'subject', filter: { sameAs: 'source' } },
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'self',
          filter: {},
          min: 0,
          max: 1,
          bind: 'discarded',
          effects: [
            {
              kind: 'move-card',
              target: 'discarded',
              from: 'hand',
              to: 'discard',
              effects: [{ kind: 'on-unit', target: 'source', operation: { kind: 'ready' } }],
            },
          ],
        },
      ],
    },
  ],
});
