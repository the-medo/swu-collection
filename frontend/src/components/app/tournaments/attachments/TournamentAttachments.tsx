import { useState } from 'react';
import { BedDouble, LockKeyhole, Paperclip, Plane, Plus, Ticket } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useFeatureSettings } from '@/api/user/useFeatureSettings.ts';
import { useUser } from '@/hooks/useUser.ts';
import { useSavedTournaments } from '@/api/tournaments/useSavedTournaments.ts';
import {
  useTournamentAttachments,
  useMutateTournamentAttachments,
} from '@/api/tournaments/useTournamentAttachments.ts';
import { Button } from '@/components/ui/button.tsx';
import { Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';
import {
  attachmentCategories,
  attachmentCategoryLabels,
  preparationStatuses,
  preparationStatusLabels,
  type TournamentAttachment,
} from '../../../../../../types/TournamentAttachment.ts';
import { AttachmentForm } from './AttachmentForm.tsx';
import { AttachmentItem } from './AttachmentItem.tsx';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { cn } from '@/lib/utils.ts';

const categoryIcons = { travel: Plane, accommodation: BedDouble, ticket: Ticket, other: Paperclip };

export function TournamentAttachments({ tournamentId }: { tournamentId: string }) {
  const user = useUser();
  const settings = useFeatureSettings();
  const saves = useSavedTournaments();
  if (!user || !saves.data?.some(row => row.tournamentId === tournamentId)) return null;
  if (settings.isError && !settings.data)
    return (
      <div role="alert" className="rounded-md border p-3 text-sm">
        Could not load your attachment preferences.{' '}
        <Button variant="link" size="sm" onClick={() => void settings.refetch()}>
          Retry
        </Button>
      </div>
    );
  return settings.data?.use_tournament_attachments ? (
    <Attachments key={`${user.id}:${tournamentId}`} tournamentId={tournamentId} />
  ) : null;
}
function Attachments({ tournamentId }: { tournamentId: string }) {
  const query = useTournamentAttachments(tournamentId);
  const mutation = useMutateTournamentAttachments(tournamentId);
  const [edit, setEdit] = useState<TournamentAttachment | null>(null);
  const [view, setView] = useState<TournamentAttachment | null>(null);
  const [remove, setRemove] = useState<TournamentAttachment | null>(null);
  const pending = mutation.isPending;
  return (
    <div data-amp-mask data-amp-mask-attributes="src,href,aria-label,download" className="min-w-0">
      <section aria-label="Your attachments" className="@container min-w-0 space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className={cn(workspaceStyles.heading, 'flex items-center gap-2')}>
              <Paperclip className="size-4 text-primary" aria-hidden="true" />
              Your attachments
            </h3>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <LockKeyhole className="size-3" aria-hidden="true" />
              Only visible to you
            </span>
          </div>
          <Link
            to="/settings"
            search={previous => ({ ...previous, page: 'features' })}
            className="rounded-sm text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            Attachment settings
          </Link>
        </header>
        <div className="grid min-w-0 items-start gap-3 @5xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className={cn(workspaceStyles.panel, '@container overflow-hidden')}>
            {query.isPending && (
              <p role="status" className="p-3 text-sm">
                Loading your attachments…
              </p>
            )}
            {query.isError && (
              <p role="alert" className="p-3 text-sm text-destructive">
                {query.error.message}{' '}
                <Button variant="link" size="sm" onClick={() => void query.refetch()}>
                  Retry
                </Button>
              </p>
            )}
            {query.data && (
              <>
                <Table aria-label="Attachment categories" className="table-fixed">
                  <TableBody>
                    {attachmentCategories.map(category => {
                      const items = query.data.attachments.filter(
                        item => item.category === category,
                      );
                      const Icon = categoryIcons[category];
                      return (
                        <TableRow
                          key={category}
                          role="row"
                          className="block hover:bg-transparent @min-[40rem]:table-row"
                        >
                          <TableHead
                            role="rowheader"
                            scope="row"
                            className="block h-auto px-3 py-3 align-top text-foreground @min-[40rem]:table-cell @min-[40rem]:w-[21.5rem]"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
                              <span className="flex items-center gap-2 text-xs font-medium">
                                <Icon
                                  className="size-3.5 shrink-0 text-primary"
                                  aria-hidden="true"
                                />
                                {attachmentCategoryLabels[category]}
                              </span>
                              <div
                                role="group"
                                aria-label={`${attachmentCategoryLabels[category]} status`}
                                className="inline-flex shrink-0 gap-0.5 rounded-lg bg-muted/60 p-0.5"
                              >
                                {preparationStatuses.map(status => (
                                  <Button
                                    key={status}
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                      'h-7 rounded-md px-2 text-[11px] font-medium text-muted-foreground shadow-none',
                                      query.data.categories[category] === status &&
                                        (status === 'yes'
                                          ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/30 hover:bg-primary/15 hover:text-primary'
                                          : 'bg-card text-foreground shadow-xs ring-1 ring-inset ring-foreground/20 hover:bg-card'),
                                    )}
                                    aria-pressed={query.data.categories[category] === status}
                                    disabled={pending}
                                    onClick={() => {
                                      if (query.data.categories[category] !== status)
                                        mutation.mutate({ type: 'category', category, status });
                                    }}
                                  >
                                    {preparationStatusLabels[status]}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </TableHead>
                          <TableCell
                            role="cell"
                            className="block px-3 pt-0 pb-2 align-middle @min-[40rem]:table-cell @min-[40rem]:py-1"
                          >
                            {items.length ? (
                              <ul
                                aria-label={`${attachmentCategoryLabels[category]} attachments`}
                                className="divide-y divide-border/60"
                              >
                                {items.map(item => (
                                  <AttachmentItem
                                    key={item.id}
                                    item={item}
                                    pending={pending}
                                    onView={() => setView(item)}
                                    onEdit={() => {
                                      mutation.reset();
                                      setEdit(item);
                                    }}
                                    onRemove={() => {
                                      mutation.reset();
                                      setRemove(item);
                                    }}
                                  />
                                ))}
                              </ul>
                            ) : (
                              <p className="py-1 text-xs leading-snug! font-normal text-muted-foreground">
                                No attachments
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {mutation.error && mutation.variables?.type === 'category' && (
                  <p role="alert" className="px-3 pb-3 text-sm text-destructive">
                    {mutation.error.message}
                  </p>
                )}
              </>
            )}
          </div>
          {query.data && (
            <section
              aria-label="Add attachment"
              className={cn(workspaceStyles.panel, 'space-y-3 bg-[var(--workspace-soft)]/40 p-3')}
            >
              <h4 className={cn(workspaceStyles.heading, 'flex items-center gap-2')}>
                <Plus className="size-4 text-primary" aria-hidden="true" />
                Add attachment
              </h4>
              <AttachmentForm
                uploadsEnabled={query.data.uploadsEnabled}
                pending={pending}
                save={action => mutation.mutateAsync(action)}
              />
            </section>
          )}
        </div>
      </section>
      <Dialog
        open={!!edit}
        onOpenChange={open => {
          if (!open && !pending) setEdit(null);
        }}
      >
        <DialogContent
          data-amp-mask
          data-amp-mask-attributes="aria-label"
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>Edit attachment</DialogTitle>
            <DialogDescription>Only you can access these tournament attachments.</DialogDescription>
          </DialogHeader>
          {edit && (
            <AttachmentForm
              key={edit.id}
              attachment={edit}
              uploadsEnabled={query.data?.uploadsEnabled ?? false}
              pending={pending}
              save={action => mutation.mutateAsync(action)}
              onSaved={() => setEdit(null)}
              onCancel={() => setEdit(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!view}
        onOpenChange={open => {
          if (!open) setView(null);
        }}
      >
        <DialogContent
          data-amp-mask
          data-amp-mask-attributes="aria-label"
          className="max-h-[85vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>{view?.title}</DialogTitle>
            <DialogDescription>Private text snippet</DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap [overflow-wrap:anywhere] font-sans text-sm">
            {view?.content}
          </pre>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!remove}
        onOpenChange={open => {
          if (!open && !pending) setRemove(null);
        }}
      >
        <AlertDialogContent data-amp-mask data-amp-mask-attributes="aria-label">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Delete “{remove?.title}”? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (remove)
                  mutation.mutate(
                    { type: 'delete', id: remove.id },
                    { onSuccess: () => setRemove(null) },
                  );
              }}
            >
              {pending ? 'Deleting…' : 'Confirm'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
