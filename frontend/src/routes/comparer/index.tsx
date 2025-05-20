import { createFileRoute } from '@tanstack/react-router';
import ComparerPage from '@/components/app/comparer/ComparerPage/ComparerPage.tsx';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/comparer/')({
  component: () => (
    <>
      <Helmet title={`Comparer | SWUBase`} />
      <ComparerPage />
    </>
  ),
});
