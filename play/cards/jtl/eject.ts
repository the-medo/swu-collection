import type { EventDefinition } from '../definition.ts';

// JTL 126. Either player's Pilot can be detached. Drawing is independent of detachment.
export const eject = {
  cardId: 'eject',
  name: 'Eject',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Gambit'],
  cost: 2,
  effects: [{ kind: 'detach-pilot' }, { kind: 'draw-cards', amount: 1 }],
} as const satisfies EventDefinition;
