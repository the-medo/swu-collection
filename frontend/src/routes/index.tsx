import { createFileRoute } from '@tanstack/react-router';
import DailySnapshots from '@/components/app/daily-snapshots/DailySnapshots.tsx';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return <DailySnapshots />;
}
