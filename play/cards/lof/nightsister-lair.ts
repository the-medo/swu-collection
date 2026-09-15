import type { BaseDefinition } from '../definition.ts';

// LOF 020. Printed text is pinned in meta-force-indirect fixture.
export const nightsisterLair = {
  cardId: 'nightsister-lair',
  name: 'Nightsister Lair',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 28,
  triggers: [
    {
      id: 'on-friendly-attack',
      timing: 'friendly-attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'subject',
            filter: {
              trait: 'Force',
            },
          },
          effects: [
            {
              kind: 'gain-force',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
