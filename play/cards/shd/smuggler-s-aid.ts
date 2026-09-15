import type { EventDefinition } from '../definition.ts';

// Official text is pinned in leader-smuggle.json.
export const smugglerSAid = {
  cardId: 'smuggler-s-aid',
  name: "Smuggler's Aid",
  kind: 'event',
  cost: 1,
  aspects: ['Heroism'],
  traits: ['Supply'],
  smuggle: [
    {
      id: 'smuggle',
      cost: 3,
      aspects: ['Heroism'],
    },
  ],
  effects: [
    {
      kind: 'heal-own-base',
      amount: 3,
    },
  ],
} as const satisfies EventDefinition;
