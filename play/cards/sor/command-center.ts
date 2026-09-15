import type { BaseDefinition } from '../definition.ts';

export const commandCenter = {
  cardId: 'command-center',
  traits: [],
  name: 'Command Center',
  kind: 'base',
  hp: 30,
  aspects: ['Command'],
} as const satisfies BaseDefinition;
