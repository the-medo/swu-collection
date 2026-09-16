import { hmwUnit } from './define.ts';

export const hmwTeeboStripedHunter = hmwUnit('teebo--striped-hunter', {
  keywords: ['Hidden'],
  auras: [
    {
      id: 'ewok-hidden',
      filter: {
        controller: 'friendly',
        trait: 'Ewok',
        otherThan: 'source',
      },
      abilities: {
        keywords: ['Hidden'],
      },
    },
  ],
});
