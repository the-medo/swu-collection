import { useNavigate, useSearch } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { useAdminReports } from '@/api/user-reports/useAdminReports';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportList, ReportQueryError } from './ReportList';
import { ReportDetailView } from './ReportDetailView';
import { UserReportHistory } from './UserReportHistory';

export function UserReportsPage() {
  const navigate = useNavigate({ from: '/admin' });
  const { reportId, reportUserId } = useSearch({ from: '/_authenticated/admin' });
  if (reportId)
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void navigate({ search: previous => ({ ...previous, reportId: undefined }) })
          }
        >
          Back to reports
        </Button>
        <ReportDetailView key={reportId} reportId={reportId} />
      </div>
    );
  return (
    <div className="space-y-5">
      <Helmet title="User reports | SWUBase" />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">User reports</h2>
        <p className="text-sm text-muted-foreground">
          Review reports and make decisions based on evidence and severity.
        </p>
      </div>
      {reportUserId ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void navigate({
                search: previous => ({ ...previous, reportUserId: undefined, reportPage: 1 }),
              })
            }
          >
            All users
          </Button>
          <UserReportHistory userId={reportUserId} title="User report history" />
        </>
      ) : (
        <ReportsQueue />
      )}
    </div>
  );
}
function ReportsQueue() {
  const navigate = useNavigate({ from: '/admin' });
  const { reportStatus, reportPage } = useSearch({ from: '/_authenticated/admin' });
  const query = useAdminReports({ status: reportStatus, page: reportPage, direction: 'all' });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={reportStatus}
          onValueChange={value => {
            if (value === 'open' || value === 'resolved' || value === 'all')
              void navigate({
                search: previous => ({ ...previous, reportStatus: value, reportPage: 1 }),
              });
          }}
        >
          <TabsList>
            <TabsTrigger value="open">Open reports</TabsTrigger>
            <TabsTrigger value="resolved">Historic reports</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="sm"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh
        </Button>
      </div>
      {query.isPending ? (
        <p role="status">Loading reports…</p>
      ) : query.isError ? (
        <ReportQueryError message={query.error.message} retry={() => void query.refetch()} />
      ) : (
        <ReportList
          data={query.data}
          onPage={page =>
            void navigate({ search: previous => ({ ...previous, reportPage: page }) })
          }
        />
      )}
    </div>
  );
}
