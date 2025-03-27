import { createFileRoute } from '@tanstack/react-router';
import ComparerPage from '@/components/app/comparer/ComparerPage/ComparerPage.tsx';

export const Route = createFileRoute('/comparer/')({
  component: ComparerPage,
});
