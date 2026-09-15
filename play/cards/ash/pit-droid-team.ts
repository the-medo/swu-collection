import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-phase.json.
export const pitDroidTeam = {
  cardId: 'pit-droid-team',
  name: 'Pit Droid Team',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Droid'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  playReductions: [
    {
      id: 'first-upgrade',
      filter: {
        playAs: 'upgrade',
      },
      host: {
        controller: 'friendly',
        otherThan: 'source',
      },
      firstEachPhase: true,
      amount: 1,
    },
  ],
} as const satisfies UnitDefinition;
