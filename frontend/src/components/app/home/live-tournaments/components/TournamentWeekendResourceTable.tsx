import { ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { useDeleteTournamentWeekendResource, useUpdateTournamentWeekendResource } from '@/api/tournament-weekends';
import Flag from '@/components/app/global/Flag.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { toast } from '@/hooks/use-toast.ts';
import type { CountryCode } from '../../../../../../../server/db/lists.ts';
import type { TournamentWeekendResourceListItem } from '../liveTournamentTypes.ts';
import { getHostName, getYoutubeEmbedUrl } from '../liveTournamentUtils.ts';
import { YouTubeEmbed } from './YouTubeEmbed.tsx';

function ResourceDestination({
  resource,
  tournamentName,
}: {
  resource: TournamentWeekendResourceListItem['resource'];
  tournamentName: string;
}) {
  if (resource.resourceType === 'melee') {
    return (
      <a
        href={resource.resourceUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-sm underline"
      >
        Open melee
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    );
  }

  if (resource.resourceType === 'stream' && getYoutubeEmbedUrl(resource.resourceUrl)) {
    return <YouTubeEmbed url={resource.resourceUrl} title={`${tournamentName} stream`} />;
  }

  return (
    <a
      href={resource.resourceUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm underline"
    >
      {resource.title || getHostName(resource.resourceUrl)}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

export function TournamentWeekendResourceTable({
  weekendId,
  resources,
  isLoading = false,
  isAdmin = false,
  emptyMessage = 'No submitted resources.',
}: {
  weekendId: string;
  resources: TournamentWeekendResourceListItem[];
  isLoading?: boolean;
  isAdmin?: boolean;
  emptyMessage?: string;
}) {
  const updateResource = useUpdateTournamentWeekendResource(weekendId);
  const deleteResource = useDeleteTournamentWeekendResource(weekendId);

  const handleApprove = async (resourceId: string) => {
    try {
      await updateResource.mutateAsync({
        resourceId,
        data: { approved: true },
      });
      toast({
        title: 'Resource approved',
        description: 'The resource is now available in the live tournament views.',
      });
    } catch (error) {
      toast({
        title: 'Failed to approve resource',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (resourceId: string) => {
    try {
      await deleteResource.mutateAsync(resourceId);
      toast({
        title: 'Resource deleted',
        description: 'The resource submission was removed.',
      });
    } catch (error) {
      toast({
        title: 'Failed to delete resource',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const isMutating = updateResource.isPending || deleteResource.isPending;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tournament</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="min-w-[18rem]">Destination</TableHead>
          <TableHead>Submitter</TableHead>
          <TableHead>Status</TableHead>
          {isAdmin ? <TableHead className="w-40 text-right">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell
              colSpan={isAdmin ? 6 : 5}
              className="h-20 text-center text-muted-foreground"
            >
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading resources...
              </span>
            </TableCell>
          </TableRow>
        ) : resources.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={isAdmin ? 6 : 5}
              className="h-20 text-center text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          resources.map(item => {
            const countryCode = item.tournament.location as CountryCode | undefined;
            return (
              <TableRow key={item.resource.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {countryCode ? (
                      <Flag countryCode={countryCode} className="h-3 w-5 rounded-sm" />
                    ) : null}
                    <span className="font-medium">{item.tournament.name}</span>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{item.resource.resourceType}</TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <ResourceDestination
                      resource={item.resource}
                      tournamentName={item.tournament.name}
                    />
                    {item.resource.title ? (
                      <div className="text-xs text-muted-foreground">{item.resource.title}</div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{item.submitterName ?? 'Unknown'}</TableCell>
                <TableCell>
                  <Badge variant={item.resource.approved ? 'success' : 'warning'}>
                    {item.resource.approved ? 'Approved' : 'Pending'}
                  </Badge>
                </TableCell>
                {isAdmin ? (
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {!item.resource.approved ? (
                        <Button
                          size="sm"
                          disabled={isMutating}
                          onClick={() => handleApprove(item.resource.id)}
                        >
                          Approve
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isMutating}
                        onClick={() => handleDelete(item.resource.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
