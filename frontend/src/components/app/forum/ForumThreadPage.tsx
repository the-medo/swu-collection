import { useState } from 'react';
import { ArrowLeft, MessagesSquare, Pencil, Trash2 } from 'lucide-react';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { Helmet } from 'react-helmet-async';
import { useForumThread, useManageForumThread } from '@/api/discussions/useForumThread.ts';
import DiscussionComments from '@/components/app/discussions/DiscussionComments.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { forumTitleSchema } from '../../../../../shared/types/discussions.ts';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';

export default function ForumThreadPage({
  id,
  focusCommentId,
}: {
  id: string;
  focusCommentId?: string;
}) {
  const query = useForumThread(id);
  const mutation = useManageForumThread(id);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const form = useForm({
    defaultValues: { title: '' },
    onSubmit: async ({ value }) => {
      try {
        await mutation.mutateAsync({ title: value.title.trim() });
        setEditing(false);
      } catch {
        /* Shown below; keep the draft. */
      }
    },
  });
  return (
    <div className={cn(workspaceStyles.theme, 'mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6')}>
      <Helmet title={`${query.data?.title ?? 'Discussion'} | SWUBase`} />
      <Link
        to="/forum"
        className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to forum
      </Link>
      {query.isPending ? (
        <p role="status" className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Loading discussion…
        </p>
      ) : query.isError ? (
        <div role="alert" className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <header className="flex flex-wrap items-start gap-3 border-b border-[color:var(--workspace-border)] pb-4">
            <div className="min-w-0 flex-1 basis-80 space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <MessagesSquare className="size-4" aria-hidden="true" /> General discussion
              </span>
              <h1 className="m-0! border-0! p-0! text-2xl! font-semibold! leading-tight! tracking-tight! [overflow-wrap:anywhere]">
                {query.data.title}
              </h1>
            </div>
            {query.data.canManage &&
              (editing ? (
                <form
                  className="w-full space-y-3 rounded-xl border bg-card p-4"
                  onSubmit={event => {
                    event.preventDefault();
                    void form.handleSubmit();
                  }}
                >
                  <form.Field
                    name="title"
                    validators={{
                      onSubmit: ({ value }) =>
                        forumTitleSchema.safeParse(value).success
                          ? undefined
                          : 'Enter a title between 1 and 160 characters.',
                    }}
                  >
                    {field => (
                      <div className="space-y-2">
                        <Label htmlFor="edit-forum-title">Title</Label>
                        <Input
                          id="edit-forum-title"
                          value={field.state.value}
                          onChange={event => field.handleChange(event.target.value)}
                          maxLength={160}
                          disabled={mutation.isPending}
                        />
                        <FormFieldError meta={field.state.meta} />
                      </div>
                    )}
                  </form.Field>
                  <div className="flex gap-2">
                    <Button disabled={mutation.isPending}>Save title</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditing(false)}
                      disabled={mutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="ml-auto flex shrink-0 flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      form.setFieldValue('title', query.data.title);
                      mutation.reset();
                      setEditing(true);
                    }}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" /> Edit title
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={mutation.isPending}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" /> Delete discussion
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this discussion?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes “{query.data.title}” and all of its comments. This cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() =>
                            mutation.mutate(
                              { delete: true },
                              {
                                onSuccess: () => {
                                  void navigate({ to: '/forum' });
                                },
                              },
                            )
                          }
                        >
                          Delete discussion
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            {mutation.error && (
              <p role="alert" className="w-full text-sm text-destructive">
                {mutation.error.message}
              </p>
            )}
          </header>
          <DiscussionComments
            discussionId={id}
            openingCommentId={query.data.openingCommentId}
            focusCommentId={focusCommentId}
          />
        </>
      )}
    </div>
  );
}
