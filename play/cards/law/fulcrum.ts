import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const fulcrum = {
  cardId: 'fulcrum',
  name: 'Fulcrum',
  kind: 'upgrade',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel'],
  unique: true,
  cost: 5,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  hostTraits: ['Rebel'],
  grants: {
    auras: [
      {
        id: 'rebel-allies',
        filter: {
          controller: 'friendly',
          trait: 'Rebel',
          otherThan: 'source',
        },
        power: 2,
        hp: 2,
      },
    ],
  },
} as const satisfies UpgradeDefinition;
