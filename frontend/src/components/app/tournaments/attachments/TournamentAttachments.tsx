import { useState } from 'react';
import { Download, ExternalLink, LockKeyhole, Pencil, Plus, Trash2 } from 'lucide-react';
import { useUser } from '@/hooks/useUser.ts';
import {
  useTournamentAttachments,
  useMutateTournamentAttachments,
} from '@/api/tournaments/useTournamentAttachments.ts';
import { Button } from '@/components/ui/button.tsx';
import { ButtonGroup } from '@/components/ui/button-group.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
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

export function TournamentAttachments({ tournamentId }: { tournamentId: string }) {
  const user = useUser();
  return user ? (
    <Attachments key={`${user.id}:${tournamentId}`} tournamentId={tournamentId} />
  ) : null;
}
function Attachments({ tournamentId }: { tournamentId: string }) {
  const query = useTournamentAttachments(tournamentId);
  const mutation = useMutateTournamentAttachments(tournamentId);
  const [edit, setEdit] = useState<TournamentAttachment | 'new' | null>(null);
  const [view, setView] = useState<TournamentAttachment | null>(null);
  const [remove, setRemove] = useState<TournamentAttachment | null>(null);
  const pending = mutation.isPending;
  return (
    <section
      aria-label="Your attachments"
      data-amp-mask
      data-amp-mask-attributes="href,aria-label,download"
      className="min-w-0 space-y-4 rounded-md border bg-card p-3 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="mb-1 flex items-center gap-2 text-base font-semibold">
            <LockKeyhole className="size-4" />
            Your attachments
          </h4>
          <p className="text-xs text-muted-foreground">
            Private to you. Keep your travel plans, bookings, tickets, and notes here.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!query.data || pending}
          onClick={() => {
            mutation.reset();
            setEdit('new');
          }}
        >
          <Plus className="size-4" />
          Add attachment
        </Button>
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {attachmentCategories.map(category => (
              <div key={category} className="space-y-1">
                <div className="text-sm font-medium">{attachmentCategoryLabels[category]}</div>
                <ButtonGroup aria-label={`${attachmentCategoryLabels[category]} status`}>
                  {preparationStatuses.map(status => (
                    <Button
                      key={status}
                      size="sm"
                      className="h-8 px-2 text-xs"
                      variant={query.data.categories[category] === status ? 'default' : 'outline'}
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
            ))}
          </div>
          {query.data.attachments.length ? (
            <Table aria-label="Private tournament attachments">
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Attachment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.attachments.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap">
                      {attachmentCategoryLabels[item.category]}
                    </TableCell>
                    <TableCell className="min-w-40 max-w-md break-words">
                      {item.kind === 'text' ? (
                        <Button
                          variant="link"
                          className="h-auto max-w-full whitespace-normal p-0 text-left"
                          onClick={() => setView(item)}
                        >
                          {item.title}
                        </Button>
                      ) : item.kind === 'link' ? (
                        // Keep private URLs out of Amplitude's automatic link-download tracking.
                        <Button
                          variant="link"
                          className="h-auto max-w-full whitespace-normal p-0 text-left"
                          onClick={() => window.open(item.content!, '_blank', 'noopener,noreferrer')}
                        >
                          {item.title}
                          <ExternalLink className="size-3 shrink-0" />
                        </Button>
                      ) : (
                        <a
                          href={item.downloadUrl!}
                          download={item.fileName ?? true}
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {item.title}
                          <Download className="size-3 shrink-0" />
                        </a>
                      )}
                      {item.fileName && (
                        <div className="text-xs text-muted-foreground">
                          {item.fileName} · {Math.ceil((item.byteSize ?? 0) / 1024)} KB
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.kind === 'text'
                        ? 'Text'
                        : item.kind === 'link'
                          ? 'Link'
                          : item.mimeType === 'application/pdf'
                            ? 'PDF'
                            : 'Image'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label={`Edit ${item.title}`}
                          disabled={pending}
                          onClick={() => {
                            mutation.reset();
                            setEdit(item);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label={`Delete ${item.title}`}
                          disabled={pending}
                          onClick={() => {
                            mutation.reset();
                            setRemove(item);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">
              No attachments yet. Add an image, PDF, text snippet, or link.
            </p>
          )}
        </>
      )}
      {mutation.error && !edit && !remove && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      {edit && (
        <AttachmentForm
          attachment={edit === 'new' ? undefined : edit}
          uploadsEnabled={query.data?.uploadsEnabled ?? false}
          pending={pending}
          save={action => mutation.mutateAsync(action)}
          onClose={() => setEdit(null)}
        />
      )}
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
          <pre className="whitespace-pre-wrap break-words font-sans text-sm">
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
    </section>
  );
}
