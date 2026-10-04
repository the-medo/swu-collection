import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useReportUserHistory } from '@/api/user-reports/useReportUserHistory';
import { useAdminReports } from '@/api/user-reports/useAdminReports';
import { useUserModerationActions } from '@/api/user-reports/useUserModerationActions';
import { useRole } from '@/hooks/useRole';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ReportList, ReportPagination, ReportQueryError } from './ReportList';
import { ModerationHistory } from './ModerationHistory';
import type { ModerationUser } from '../../../../../../shared/types/userReportModeration';

export function RestrictionBadge({ user }: { user: ModerationUser }) {
  return (
    <Badge variant={user.restriction === 'none' ? 'secondary' : 'destructive'}>
      {!user.exists
        ? 'Deleted account'
        : user.restriction === 'banned'
          ? 'Banned'
          : user.restriction === 'suspended'
            ? `Suspended until ${new Date(user.expiresAt!).toLocaleString()}`
            : 'No active restriction'}
    </Badge>
  );
}
export function UserReportHistory({
  userId,
  title,
  fallbackName,
}: {
  userId: string;
  title?: string;
  fallbackName?: string;
}) {
  const isAdmin = useRole()('admin');
  if (!isAdmin) return null;
  return <History key={userId} userId={userId} title={title} fallbackName={fallbackName} />;
}
function History({
  userId,
  title,
  fallbackName,
}: {
  userId: string;
  title?: string;
  fallbackName?: string;
}) {
  const profile = useReportUserHistory(userId);
  const [tab, setTab] = useState<'received' | 'sent' | 'actions'>('received');
  return (
    <section className="min-w-0 space-y-3 rounded-lg border p-3 sm:p-4">
      {title && <h3 className="text-base font-semibold">{title}</h3>}
      {profile.isPending ? (
        <p role="status">Loading user history…</p>
      ) : profile.isError ? (
        <ReportQueryError message={profile.error.message} retry={() => void profile.refetch()} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {profile.data.exists ? (
              <Link
                className="break-words font-medium text-primary hover:underline"
                to="/users/$userId"
                params={{ userId }}
                search={{ userTab: 'reports' }}
              >
                {profile.data.displayName}
              </Link>
            ) : (
              <strong className="break-words">{fallbackName ?? profile.data.displayName}</strong>
            )}
            <RestrictionBadge user={profile.data} />
          </div>
          <p className="text-sm text-muted-foreground">
            {profile.data.counts.received} received ({profile.data.counts.openReceived} open) ·{' '}
            {profile.data.counts.sent} sent
          </p>
        </>
      )}
      <Tabs
        value={tab}
        onValueChange={value => {
          if (value === 'sent' || value === 'received' || value === 'actions') setTab(value);
        }}
      >
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="received" className="px-1 text-xs">
            Received
          </TabsTrigger>
          <TabsTrigger value="sent" className="px-1 text-xs">
            Sent
          </TabsTrigger>
          <TabsTrigger value="actions" className="px-1 text-xs">
            Decisions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="received">
          <HistoryReports userId={userId} direction="received" />
        </TabsContent>
        <TabsContent value="sent">
          <HistoryReports userId={userId} direction="sent" />
        </TabsContent>
        <TabsContent value="actions">
          <HistoryActions userId={userId} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
function HistoryReports({ userId, direction }: { userId: string; direction: 'sent' | 'received' }) {
  const [page, setPage] = useState(1);
  const query = useAdminReports({ userId, direction, status: 'all', page });
  return query.isPending ? (
    <p role="status">Loading reports…</p>
  ) : query.isError ? (
    <ReportQueryError message={query.error.message} retry={() => void query.refetch()} />
  ) : (
    <ReportList data={query.data} onPage={setPage} />
  );
}
function HistoryActions({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const query = useUserModerationActions(userId, page);
  return query.isPending ? (
    <p role="status">Loading decisions…</p>
  ) : query.isError ? (
    <ReportQueryError message={query.error.message} retry={() => void query.refetch()} />
  ) : (
    <div className="space-y-3">
      <ModerationHistory actions={query.data.actions} />
      <ReportPagination {...query.data} onPage={setPage} />
    </div>
  );
}
