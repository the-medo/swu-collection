import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCassianAndorRebellionsAreBuiltOnHope = {
  cardId: 'cassian-andor--rebellions-are-built-on-hope',
  name: 'Cassian Andor, Rebellions Are Built On Hope',
  kind: 'unit',
  aspects: ['Heroism', 'Aggression'],
  traits: ['Rebel'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 5,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 5,
      aspects: ['Aggression', 'Heroism'],
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'ready',
          },
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'played-using-smuggle',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
