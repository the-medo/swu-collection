import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetStrategicAnalysis = {
  cardId: 'strategic-analysis',
  name: 'Strategic Analysis',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Plan'],
  cost: 5,
  effects: [
    {
      kind: 'draw-cards',
      amount: 3,
    },
  ],
} as const satisfies EventDefinition;
