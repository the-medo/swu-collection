import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const weazelFightingBack = {
  cardId: 'weazel--fighting-back',
  name: 'Weazel, Fighting Back',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Underworld'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
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
} as const satisfies UnitDefinition;
