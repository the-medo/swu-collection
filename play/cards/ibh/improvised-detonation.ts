import type { EventDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const improvisedDetonation = {
  cardId: 'improvised-detonation',
  name: 'Improvised Detonation',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'attack-with-unit',
      powerBonus: 2,
    },
  ],
} as const satisfies EventDefinition;
