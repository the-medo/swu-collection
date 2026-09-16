import { hmwUnit } from './define.ts';

export const hmwQuiGonJinnWellHandleThis = hmwUnit('qui-gon-jinn--we-ll-handle-this', {
  keywords: ['Grit'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: { attackedBaseThisPhase: true },
          bind: 'target',
          optional: true,
          effects: [
            {
              kind: 'if',
              condition: { kind: 'unit-matches', target: 'target', filter: { leader: true } },
              effects: [{ kind: 'defeat-bound', targets: ['target', 'source'] }],
              otherwise: [{ kind: 'defeat-bound', targets: ['target'] }],
            },
          ],
        },
      ],
    },
  ],
});
