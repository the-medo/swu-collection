import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const syndicateSpiceRunner = {
  cardId: 'syndicate-spice-runner',
  name: 'Syndicate Spice Runner',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Underworld'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 3,
          filter: 'unit',
          trait: 'Underworld',
          max: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
