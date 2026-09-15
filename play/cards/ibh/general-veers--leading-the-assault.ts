import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const generalVeersLeadingTheAssault = {
  cardId: 'general-veers--leading-the-assault',
  name: 'General Veers, Leading the Assault',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 5,
  power: 3,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              anyAspect: ['Vigilance'],
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'damage-bases',
              amount: 2,
              targets: 'enemy',
            },
            {
              kind: 'heal-own-base',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
