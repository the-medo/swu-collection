import { createFileRoute } from '@tanstack/react-router';
import { formatData } from '../../../../types/Format.ts';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import { tournamentTypes } from '../../../../types/Tournament.ts';
import MetaPage from '@/components/app/meta/MetaPage/MetaPage.tsx';

export const DEFAULT_MIN_TOURNAMENT_TYPE = 'sq';

const searchParams = z.object({
  formatId: z
    .number()
    .int()
    .min(formatData[0].id)
    .max(formatData[formatData.length - 1].id)
    .optional()
    .default(formatData[0].id),
  metaId: z.number().int().min(1).optional(),
  minTournamentType: z
    .enum([...tournamentTypes])
    .optional()
    .default(DEFAULT_MIN_TOURNAMENT_TYPE),
  page: z.enum(['tournaments', 'meta', 'matchups', 'decks']).default('meta'),
});

export const Route = createFileRoute('/meta/')({
  component: MetaPage,
  validateSearch: zodValidator(searchParams),
});
