import type { EventDefinition } from '../definition.ts';
export const theEyeOfAldhani = {
  cardId: 'the-eye-of-aldhani',
  name: 'The Eye of Aldhani',
  kind: 'event',
  cost: 1,
  aspects: ['Vigilance'],
  traits: ['Innate', 'Trick'],
  effects: [
    { kind: 'schedule-next-action', effects: [{ kind: 'tax-units', player: 'enemy', amount: 1 }] },
  ],
} as const satisfies EventDefinition;
