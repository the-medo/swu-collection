import type { UnitDefinition } from '../definition.ts';
// The defeated unit's former controller owns the searched zones; that need not
// be its owner. The search follows only an actual defeat, not a prevented one.
export const annihilatorTaggeSFlagship = {
  cardId: 'annihilator--tagge-s-flagship',
  name: "Annihilator, Tagge's Flagship",
  kind: 'unit',
  unique: true,
  cost: 11,
  power: 12,
  hp: 12,
  arena: 'space',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  triggers: (['played', 'defeated'] as const).map(timing => ({
    id: `${timing}-purge`,
    timing,
    effects: [
      {
        kind: 'select-unit',
        filter: { controller: 'enemy' },
        bind: 'victim',
        optional: true,
        effects: [
          {
            kind: 'on-unit',
            target: 'victim',
            operation: { kind: 'defeat' },
            ifYouDo: [
              {
                kind: 'search-zones',
                zones: ['deck', 'hand'],
                player: 'bound-controller',
                ownerOf: 'victim',
                filter: { sameNameAs: 'victim' },
                to: 'discard',
              },
            ],
          },
        ],
      },
    ],
  })),
} as const satisfies UnitDefinition;
