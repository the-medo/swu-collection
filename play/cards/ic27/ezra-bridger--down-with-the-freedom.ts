import { ic27Unit } from './define.ts';

export const ic27EzraBridgerDownWithTheFreedom = ic27Unit('ezra-bridger--down-with-the-freedom', {
  raid: 2,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
            anyAspect: ['Heroism'],
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  raid: 2,
                },
              },
            },
          ],
        },
      ],
    },
  ],
});
