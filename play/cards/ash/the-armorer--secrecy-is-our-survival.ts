import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const theArmorerSecrecyIsOurSurvival = {
  cardId: 'the-armorer--secrecy-is-our-survival',
  name: 'The Armorer, Secrecy is Our Survival',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Mandalorian'],
  unique: true,
  cost: 6,
  power: 5,
  hp: 5,
  arena: 'ground',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
            hasKeyword: 'Shielded',
          },
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
