import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const chamSyndullaRallyingRyloth = {
  cardId: 'cham-syndulla--rallying-ryloth',
  name: 'Cham Syndulla, Rallying Ryloth',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Rebel', "Twi'lek"],
  unique: true,
  cost: 4,
  power: 5,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'catch-up',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'fewer-resources-than-opponent',
          },
          effects: [
            {
              kind: 'resource-top',
              optional: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
