import { createFileRoute, notFound } from '@tanstack/react-router';
import { z } from 'zod';
import TrainingDashboard from '@/components/app/crossfire-training/TrainingDashboard.tsx';

export const Route = createFileRoute('/tools/crossfire-training/')({
  head: () => ({ meta: [{ title: 'Crossfire Training | SWUBase' }] }),
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  validateSearch: z.object({
    aiRun: z
      .string()
      .regex(/^(legacy|specialists|specialists-[0-9a-f-]{36})$/)
      .optional()
      .catch(undefined),
    aiDeck: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]{0,79}$/)
      .catch('krennic'),
    aiOpponent: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]{0,79}$/)
      .catch('vader'),
    aiMeasure: z.enum(['training', 'evaluation']).catch('training'),
    aiCycle: z.coerce.number().int().positive().safe().optional().catch(undefined),
  }),
  component: TrainingDashboard,
});
