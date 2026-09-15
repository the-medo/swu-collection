import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const maarvaAndorWeVeBeenSleeping = {
  cardId: 'maarva-andor--we-ve-been-sleeping',
  name: "Maarva Andor, We've Been Sleeping",
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
            trait: 'Rebel',
          },
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
