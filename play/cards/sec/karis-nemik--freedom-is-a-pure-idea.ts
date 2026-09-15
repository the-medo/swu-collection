import type { UnitDefinition } from '../definition.ts';

// SEC 148. Printed text and rulings are pinned in meta-disclose fixture.
export const karisNemikFreedomIsAPureIdea = {
  cardId: 'karis-nemik--freedom-is-a-pure-idea',
  name: 'Karis Nemik, Freedom is a Pure Idea',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  unique: true,
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Aggression', 'Heroism'],
          effects: [
            {
              kind: 'create-unit',
              cardId: 'spy',
              count: 1,
              bind: 'spy',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'spy',
                  operation: {
                    kind: 'ready',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
