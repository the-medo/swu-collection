import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const sifoDyasCommissioningAnArmy = {
  cardId: 'sifo-dyas--commissioning-an-army',
  name: 'Sifo-Dyas, Commissioning An Army',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'when-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'search-deck',
          count: 8,
          filter: 'unit',
          max: 8,
          trait: 'Clone',
          maxTotalCost: 4,
          destination: 'discard',
          bind: 'found',
          afterEach: [
            {
              kind: 'grant-discard-play',
              target: 'found',
              player: 'self',
              free: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
