import { ic27Unit } from './define.ts';

export const ic27DarthVaderUselessToResist = ic27Unit('darth-vader--useless-to-resist', {
  keywords: ['Ambush'],
  auras: [
    {
      id: 'friendly-ambush',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
      },
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
});
