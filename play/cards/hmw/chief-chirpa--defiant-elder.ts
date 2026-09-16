import { hmwUnit } from './define.ts';

export const hmwChiefChirpaDefiantElder = hmwUnit('chief-chirpa--defiant-elder', {
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
          trait: 'Ewok',
          otherThan: 'source',
        },
      },
    },
  ],
});
