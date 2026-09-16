import { hmwEvent } from './define.ts';

export const hmwSeismicDetonation = hmwEvent('seismic-detonation', [
  {
    kind: 'choose-mode',
    options: (['ground', 'space'] as const).map(arena => ({
      id: arena,
      effects: [
        {
          kind: 'schedule-regroup-effects' as const,
          effects: [
            {
              kind: 'damage-units' as const,
              amount: 3,
              filter: { controller: 'enemy' as const, arena },
            },
          ],
        },
      ],
    })),
  },
]);
