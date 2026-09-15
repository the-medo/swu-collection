import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const torpedoBarrage = {
  cardId: 'torpedo-barrage',
  name: 'Torpedo Barrage',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'indirect-damage',
      amount: 5,
      recipient: 'chosen',
    },
  ],
} as const satisfies EventDefinition;
