import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheChaosOfWar = {
  cardId: 'the-chaos-of-war',
  name: 'The Chaos of War',
  kind: 'event',
  aspects: ['Aggression', 'Aggression'],
  traits: ['Plan'],
  cost: 3,
  effects: [
    {
      kind: 'damage-assignments',
      assignments: [
        {
          target: 'own-base',
          amount: {
            kind: 'zone-size',
            zone: 'hand',
            player: 'self',
          },
        },
        {
          target: 'enemy-base',
          amount: {
            kind: 'zone-size',
            zone: 'hand',
            player: 'enemy',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
