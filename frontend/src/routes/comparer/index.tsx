import { createFileRoute } from '@tanstack/react-router';
import ComparerPage from '@/components/app/comparer/ComparerPage/ComparerPage.tsx';
import { Helmet } from 'react-helmet-async';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

const searchParams = z.object({
  state: z.string().optional(),
});

export const Route = createFileRoute('/comparer/')({
  validateSearch: zodValidator(searchParams),
  component: () => (
    <>
      <Helmet title={`Comparer | SWUBase`} />
      <ComparerPage />
    </>
  ),
});
