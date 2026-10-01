import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useFeatureSettings } from '@/api/user/useFeatureSettings.ts';
import { useUser } from '@/hooks/useUser.ts';
import {
  useTournamentAttachments,
  useMutateTournamentAttachments,
} from '@/api/tournaments/useTournamentAttachments.ts';
import { Button } from '@/components/ui/button.tsx';
import { ButtonGroup } from '@/components/ui/button-group.tsx';
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

export function TournamentAttachments({ tournamentId }: { tournamentId: string }) {
  const user = useUser();
  const settings = useFeatureSettings();
  if (user && settings.isError && !settings.data)
    return (
      <div role="alert" className="rounded-md border p-3 text-sm">
        Could not load your attachment preferences.{' '}
        <Button variant="link" size="sm" onClick={() => void settings.refetch()}>
          Retry
        </Button>
      </div>
    );
  return user && settings.data?.use_tournament_attachments ? (
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
      <section
        aria-label="Your attachments"
        className="@container min-w-0 space-y-4 rounded-md border bg-card p-3 shadow-xs"
      >
        <div className="grid min-w-0 items-start gap-4 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="@container min-w-0 space-y-3">
            <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h4 className="flex items-center gap-2 text-base font-semibold">
                <LockKeyhole className="size-4" />
                Your attachments
              </h4>
              <span className="text-xs text-muted-foreground">
                Turn these sections off in{' '}
                <Link
                  to="/settings"
                  search={previous => ({ ...previous, page: 'features' })}
                  className="text-primary underline underline-offset-2"
                >
                  settings
                </Link>
                .
              </span>
            </div>
            {query.isPending && (
              <p role="status" className="text-sm">
                Loading your attachments…
              </p>
            )}
            {query.isError && (
              <p role="alert" className="text-sm text-destructive">
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
                      return (
                        <TableRow
                          key={category}
                          role="row"
                          className="block @min-[32rem]:table-row"
                        >
                          <TableHead
                            role="rowheader"
                            scope="row"
                            className="block h-auto px-2 py-2 align-top text-foreground @min-[32rem]:table-cell @min-[32rem]:w-[19rem]"
                          >
                            <div className="grid grid-cols-[6.25rem_minmax(0,1fr)] items-center gap-2 @min-[24rem]:grid-cols-[7.5rem_minmax(0,1fr)]">
                              <span className="text-xs @min-[24rem]:text-sm">
                                {attachmentCategoryLabels[category]}
                              </span>
                              <ButtonGroup
                                aria-label={`${attachmentCategoryLabels[category]} status`}
                              >
                                {preparationStatuses.map(status => (
                                  <Button
                                    key={status}
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    variant={
                                      query.data.categories[category] === status
                                        ? 'default'
                                        : 'outline'
                                    }
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
                              </ButtonGroup>
                            </div>
                          </TableHead>
                          <TableCell
                            role="cell"
                            className="block px-2 pt-0 pb-2 align-top @min-[32rem]:table-cell @min-[32rem]:py-1"
                          >
                            {items.length ? (
                              <ul
                                aria-label={`${attachmentCategoryLabels[category]} attachments`}
                                className="divide-y"
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
                              <p className="py-1.5 text-xs leading-snug! font-normal text-muted-foreground">
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
                  <p role="alert" className="text-sm text-destructive">
                    {mutation.error.message}
                  </p>
                )}
                <p className="text-xs leading-snug! text-muted-foreground">
                  Keep your tournament documents together in one place.
                </p>
              </>
            )}
          </div>
          {query.data && (
            <section
              aria-label="Add attachment"
              className="min-w-0 space-y-4 border-t pt-4 @4xl:border-t-0 @4xl:border-l @4xl:pt-0 @4xl:pl-4"
            >
              <h4 className="text-base font-semibold">Add attachment</h4>
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
          <pre className="whitespace-pre-wrap break-words font-sans text-sm">{view?.content}</pre>
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
