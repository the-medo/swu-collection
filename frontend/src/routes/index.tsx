import { createFileRoute } from '@tanstack/react-router';
import LandingPage from '@/components/app/pages/LandingPage.tsx';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return <LandingPage />;
}
