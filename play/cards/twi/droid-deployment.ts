import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetDroidDeployment = {
  cardId: 'droid-deployment',
  name: 'Droid Deployment',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Supply'],
  cost: 2,
  effects: [
    {
      kind: 'create-unit',
      cardId: 'battle-droid',
      count: 2,
    },
  ],
} as const satisfies EventDefinition;
