import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { useCallback } from 'react';
import { booleanPreprocessor } from '../../../shared/lib/zod/booleanPreprocessor.ts';
import {
  battlefieldShowcaseFactionSchema,
  battlefieldShowcaseSortSchema,
  type BattlefieldShowcaseFilters,
} from '../../../shared/types/battlefield.ts';
import { BattlefieldShowcase } from '@/components/app/battlefield/BattlefieldShowcase';

export const Route = createFileRoute('/battlefield-showcase')({
  validateSearch: z.object({
    battlefieldPage: z.coerce.number().int().min(1).max(1000000).catch(1).default(1),
    battlefieldSearch: z.string().trim().max(80).catch('').default(''),
    battlefieldFaction: battlefieldShowcaseFactionSchema.catch('all').default('all'),
    battlefieldAffordable: booleanPreprocessor.catch(false).default(false),
    battlefieldSort: battlefieldShowcaseSortSchema.catch('newest').default('newest'),
  }),
  component: ShowcaseRoute,
});
function ShowcaseRoute() {
  const {
    battlefieldPage,
    battlefieldSearch,
    battlefieldFaction,
    battlefieldAffordable,
    battlefieldSort,
  } = Route.useSearch();
  const navigate = Route.useNavigate();
  const changeFilters = useCallback(
    (patch: Partial<BattlefieldShowcaseFilters>) =>
      void navigate({
        search: previous => ({
          ...previous,
          battlefieldPage: 1,
          battlefieldSearch: patch.search ?? previous.battlefieldSearch,
          battlefieldFaction: patch.faction ?? previous.battlefieldFaction,
          battlefieldAffordable: patch.withinCredits ?? previous.battlefieldAffordable,
          battlefieldSort: patch.sort ?? previous.battlefieldSort,
        }),
      }),
    [navigate],
  );
  return (
    <BattlefieldShowcase
      page={battlefieldPage}
      filters={{
        search: battlefieldSearch,
        faction: battlefieldFaction,
        withinCredits: battlefieldAffordable,
        sort: battlefieldSort,
      }}
      onFilters={changeFilters}
      onPage={page =>
        void navigate({ search: previous => ({ ...previous, battlefieldPage: page }) })
      }
    />
  );
}
