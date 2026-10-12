import { useRef } from 'react';
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
    <div className="mx-auto w-full max-w-4xl space-y-6 px-3 py-6 sm:px-6">
      <Helmet title="New discussion | SWUBase" />
      <Link to="/forum" className="text-sm text-muted-foreground hover:underline">
        ← Back to forum
      </Link>
      <header>
        <h1 className="text-3xl!">New discussion</h1>
        <p className="text-sm text-muted-foreground">
          Give your conversation a title and share what’s on your mind.
        </p>
      </header>
      <SignInWrapper text="Sign in to start a discussion">
        <div className="space-y-5 rounded-xl border bg-card p-4 sm:p-6">
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
          <Label>Opening post</Label>
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
        </div>
      </SignInWrapper>
    </div>
  );
}
