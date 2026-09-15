import { lazy, Suspense } from 'react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { useReport } from '@/api/crossfire/useReports.ts';
import { Button } from '@/components/ui/button.tsx';
import { CrossfireSession } from './CrossfireSession.tsx';
const ReportBoard = lazy(() => import('./ReportBoard.tsx'));

function Report({ sessionId, reportId }: { sessionId: string; reportId: string }) {
  const query = useReport(sessionId, reportId);
  if (query.isPending)
    return (
      <p role="status" className="p-6">
        Loading the saved report…
      </p>
    );
  if (query.error || !query.data)
    return (
      <div className="p-6 space-y-4">
        <p role="alert">This report is unavailable. Sign in as its reporter or a SWUBASE admin.</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Retry
        </Button>
        <Link to="/crossfire">Back to Crossfire</Link>
      </div>
    );
  return (
    <Suspense fallback={<p className="p-6">Loading the board…</p>}>
      <ReportBoard report={query.data} />
    </Suspense>
  );
}
export function CrossfireReportPage({ reportId }: { reportId: string }) {
  return (
    <>
      <Helmet>
        <title>Crossfire bug report | SWUBASE</title>
      </Helmet>
      <CrossfireSession>
        {session => <Report sessionId={session.session.id} reportId={reportId} />}
      </CrossfireSession>
    </>
  );
}
