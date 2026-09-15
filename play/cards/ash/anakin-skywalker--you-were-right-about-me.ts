import type { UnitDefinition } from '../definition.ts';

// ASH 255. Printed text is pinned in meta-continuous fixture.
export const anakinSkywalkerYouWereRightAboutMe = {
  cardId: 'anakin-skywalker--you-were-right-about-me',
  name: 'Anakin Skywalker, You Were Right About Me',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Force', 'Jedi'],
  cost: 5,
  unique: true,
  power: 6,
  hp: 4,
  arena: 'ground',
  keywords: ['Hidden', 'Saboteur'],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
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
