import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { useUpdateTournamentWeekendResource } from '@/api/tournament-weekends';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { toast } from '@/hooks/use-toast.ts';
import type { LiveTournamentWeekendDetail } from '../../../../../../types/TournamentWeekend.ts';

export function ResourceApproval({
  weekendId,
  detail,
}: {
  weekendId: string;
  detail: LiveTournamentWeekendDetail;
}) {
  const updateResource = useUpdateTournamentWeekendResource(weekendId);
  const tournamentNameById = useMemo(
    () => new Map(detail.tournaments.map(row => [row.tournament.id, row.tournament.name])),
    [detail.tournaments],
  );

  const update = async (resourceId: string, approved: boolean) => {
    try {
      await updateResource.mutateAsync({
        resourceId,
        data: { approved },
      });
      toast({
        title: approved ? 'Resource approved' : 'Resource hidden',
        description: approved
          ? 'The link is now visible on the live page.'
          : 'The link is no longer visible on the live page.',
      });
    } catch (error) {
      toast({
        title: 'Failed to update resource',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="space-y-3 rounded-md border bg-background p-3">
      <div>
        <h3 className="text-sm font-medium">Resources</h3>
        <p className="text-xs text-muted-foreground">
          Approve streams and VODs submitted for weekend tournaments.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tournament</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Link</TableHead>
            <TableHead className="w-28"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {detail.resources.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                No submitted resources.
              </TableCell>
            </TableRow>
          ) : (
            detail.resources.map(resource => (
              <TableRow key={resource.id}>
                <TableCell>
                  {tournamentNameById.get(resource.tournamentId) ?? resource.tournamentId}
                </TableCell>
                <TableCell className="capitalize">{resource.resourceType}</TableCell>
                <TableCell>
                  <div className="font-medium">{resource.title || '-'}</div>
                  {resource.description && (
                    <div className="text-xs text-muted-foreground">{resource.description}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={resource.approved ? 'success' : 'warning'}>
                    {resource.approved ? 'Approved' : 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={resource.resourceUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    variant={resource.approved ? 'outline' : 'default'}
                    size="sm"
                    disabled={updateResource.isPending}
                    onClick={() => update(resource.id, !resource.approved)}
                  >
                    {resource.approved ? 'Hide' : 'Approve'}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
