import type { CardEffect, LeaderDefinition } from '../definition.ts';

// Each alternative discloses one icon; target eligibility uses every aspect on
// every revealed card, including optional extra cards (v8 §8.38).
const training = {
  kind: 'choose-mode',
  options: (['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism'] as const).map(
    aspect =>
      ({
        id: aspect.toLowerCase(),
        effects: [
          {
            kind: 'disclose',
            aspects: [aspect],
            group: 'disclosed',
            effects: [
              {
                kind: 'select-unit',
                filter: { sharesNoAspectWithGroup: 'disclosed' },
                optional: false,
                bind: 'chosen',
                effects: [
                  {
                    kind: 'on-unit',
                    target: 'chosen',
                    operation: { kind: 'give-token', token: 'experience', count: 1 },
                  },
                ],
              },
            ],
          },
        ],
      }) as const,
  ),
} as const satisfies CardEffect;

export const leiaOrganaOfASecretBloodline = {
  cardId: 'leia-organa--of-a-secret-bloodline',
  name: 'Leia Organa, Of A Secret Bloodline',
  kind: 'leader',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['New Republic', 'Official'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            { kind: 'deploy', as: 'unit', condition: { kind: 'resources-at-least', amount: 6 } },
          ],
        },
        {
          id: 'disclose-training',
          costs: [{ kind: 'resources', amount: 1 }, { kind: 'exhaust-self' }],
          limit: null,
          effects: [training],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 7,
      arena: 'ground',
      triggers: [
        { id: 'disclose-training', timing: 'attack', optional: true, effects: [training] },
      ],
    },
  },
} as const satisfies LeaderDefinition;
