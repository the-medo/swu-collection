import { hmwUnit } from './define.ts';

export const hmwTechIThoughtItWasObvious = hmwUnit('tech--i-thought-it-was-obvious', {
  triggers: [
    {
      id: 'damaged',
      timing: 'friendly-damage-survived',
      condition: { kind: 'unit-matches', target: 'subject', filter: { sameAs: 'source' } },
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
});
