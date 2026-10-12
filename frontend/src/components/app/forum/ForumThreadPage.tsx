import { useState } from 'react';
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
    <div className="mx-auto w-full max-w-5xl space-y-6 px-3 py-6 sm:px-6">
      <Helmet title={`${query.data?.title ?? 'Discussion'} | SWUBase`} />
      <Link to="/forum" className="text-sm text-muted-foreground hover:underline">
        ← Back to forum
      </Link>
      {query.isPending ? (
        <p role="status">Loading discussion…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <header className="flex flex-wrap items-start gap-3">
            <h1 className="m-0! min-w-0 flex-1 basis-64 break-words text-3xl!">
              {query.data.title}
            </h1>
            {query.data.canManage &&
              (editing ? (
                <form
                  className="w-full space-y-3"
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
                    Edit title
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={mutation.isPending}
                    onClick={() => {
                      if (window.confirm('Delete this discussion and all of its comments?'))
                        mutation.mutate(
                          { delete: true },
                          {
                            onSuccess: () => {
                              void navigate({ to: '/forum' });
                            },
                          },
                        );
                    }}
                  >
                    Delete discussion
                  </Button>
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
