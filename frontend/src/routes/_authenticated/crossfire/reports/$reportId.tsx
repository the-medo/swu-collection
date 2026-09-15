import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { CrossfireReportPage } from '@/components/app/crossfire/CrossfireReportPage.tsx';
export const Route = createFileRoute('/_authenticated/crossfire/reports/$reportId')({
  component: Page,
});
function Page() {
  const { reportId } = Route.useParams();
  return z.uuid().safeParse(reportId).success ? (
    <CrossfireReportPage reportId={reportId} />
  ) : (
    <p role="alert" className="p-6">
      This report link is invalid.
    </p>
  );
}
