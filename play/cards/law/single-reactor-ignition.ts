import type { EventDefinition } from '../definition.ts';

// LAW . V8 rules; printed text pinned in meta combat fixture.
export const singleReactorIgnition = {
  cardId: 'single-reactor-ignition',
  name: 'Single Reactor Ignition',
  kind: 'event',
  aspects: ['Vigilance', 'Aggression', 'Villainy'],
  traits: ['Disaster', 'Tactic'],
  cost: 8,
  effects: [
    {
      kind: 'defeat-units',
      filter: {},
      damageEnemyBase: 1,
    },
  ],
} as const satisfies EventDefinition;
