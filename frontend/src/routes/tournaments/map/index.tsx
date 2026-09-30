import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { z } from 'zod';
import { SwuSet } from '../../../../../types/enums.ts';
import TournamentsMap from '@/components/app/tournaments/pages/TournamentsMap/TournamentsMap.tsx';
import { defaultMapTypes } from '@/components/app/tournaments/pages/TournamentsMap/mapData.ts';

export const Route = createFileRoute('/tournaments/map/')({
  validateSearch: z.object({
    tmSet: z.enum(SwuSet).optional(),
    tmFrom: z.iso.date().optional(),
    tmTo: z.iso.date().optional(),
    tmTypes: z.array(z.enum(defaultMapTypes)).max(3).optional(),
    tmFormats: z
      .array(z.union([z.literal(1), z.literal(3), z.literal(6)]))
      .max(3)
      .optional(),
  }),
  component: () => (
    <>
      <Helmet title="Tournament Map | SWUBase" />
      <div className="p-2">
        <TournamentsMap />
      </div>
    </>
  ),
});
