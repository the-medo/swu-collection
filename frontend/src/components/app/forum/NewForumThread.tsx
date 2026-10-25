import { useRef } from 'react';
import { ArrowLeft, MessageSquarePlus } from 'lucide-react';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles';
import { cn } from '@/lib/utils';

import { Link, useBlocker, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { Helmet } from 'react-helmet-async';
import { useCreateForumThread } from '@/api/discussions/useForumThread.ts';
import SignInWrapper from '@/components/app/auth/SignInWrapper.tsx';
import PostDocumentForm from '@/components/app/rich-text-editor/PostDocumentForm.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import { forumTitleSchema } from '../../../../../shared/types/discussions.ts';

export default function NewForumThread() {
  const mutation = useCreateForumThread();
  const navigate = useNavigate();
  const savedId = useRef<string | undefined>(undefined);
  const bodyDirty = useRef(false);
  const form = useForm({ defaultValues: { title: '' } });
  useBlocker({
    shouldBlockFn: ({ current, next }) =>
      !savedId.current &&
      (bodyDirty.current || !!form.getFieldValue('title').trim()) &&
      (current.pathname !== next.pathname ||
        JSON.stringify(current.search) !== JSON.stringify(next.search)) &&
      !window.confirm('Leave without saving your discussion?'),
    enableBeforeUnload: () =>
      !savedId.current && (bodyDirty.current || !!form.getFieldValue('title').trim()),
  });
  return (
    <div className={cn(workspaceStyles.theme, 'mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6')}>
      <Helmet title="New discussion | SWUBase" />
      <Link
        to="/forum"
        className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to forum
      </Link>
      <header className="space-y-2 border-b border-[color:var(--workspace-border)] pb-4">
        <h1 className="m-0! border-0! p-0! flex items-center gap-2.5 text-2xl! font-semibold! tracking-tight!">
          <MessageSquarePlus className="size-6 text-primary" aria-hidden="true" />
          New discussion
        </h1>
        <p className="text-sm text-muted-foreground">
          Give your conversation a title and share what’s on your mind.
        </p>
      </header>
      <SignInWrapper text="Sign in to start a discussion">
        <div className={cn(workspaceStyles.panel, 'space-y-4 p-4 sm:p-5')}>
          <form.Field
            name="title"
            validators={{
              onBlur: ({ value }) =>
                forumTitleSchema.safeParse(value).success
                  ? undefined
                  : 'Enter a title between 1 and 160 characters.',
            }}
          >
            {field => (
              <div className="space-y-2">
                <Label htmlFor="forum-title">Title</Label>
                <Input
                  id="forum-title"
                  className="h-11 bg-background text-base"
                  placeholder="What would you like to discuss?"
                  maxLength={160}
                  value={field.state.value}
                  onChange={event => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  disabled={mutation.isPending}
                />
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          </form.Field>
          <div className="space-y-1 border-t pt-4">
            <p id="opening-post-label" className="text-sm font-semibold">
              Opening post
            </p>
            <p className="text-xs text-muted-foreground">
              Add your question, idea or story. You can include links and format your post.
            </p>
          </div>
          <section aria-labelledby="opening-post-label">
            <PostDocumentForm
              type="comments"
              documentLabel="discussion"
              initialPost={null}
              submitLabel="Create discussion"
              busy={mutation.isPending}
              protectNavigation={false}
              onDraftStateChange={state => {
                bodyDirty.current = state.dirty;
              }}
              onSave={async content => {
                const title = forumTitleSchema.safeParse(form.getFieldValue('title'));
                if (!title.success) throw new Error('Enter a title between 1 and 160 characters.');
                const result = await mutation.mutateAsync({ title: title.data, content });
                savedId.current = result.id;
              }}
              onClose={() => {
                const id = savedId.current;
                if (id) void navigate({ to: '/forum/$discussionId', params: { discussionId: id } });
                else {
                  bodyDirty.current = false;
                  form.reset();
                  void navigate({ to: '/forum' });
                }
              }}
            />
          </section>
        </div>
      </SignInWrapper>
    </div>
  );
}
