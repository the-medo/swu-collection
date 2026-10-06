import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import {
  zTeamBookmarkRequest,
  type ZTeamBookmarkRequest,
} from '../../../../../../types/ZTeamBookmark.ts';

export function TeamBookmarkForm({
  bookmark,
  pending,
  onSave,
  onCancel,
}: {
  bookmark?: ZTeamBookmarkRequest;
  pending: boolean;
  onSave: (value: ZTeamBookmarkRequest) => Promise<unknown>;
  onCancel: () => void;
}) {
  const form = useForm({
    defaultValues: { label: bookmark?.label ?? '', url: bookmark?.url ?? '' },
    onSubmit: async ({ value }) => {
      await onSave(zTeamBookmarkRequest.parse(value)).then(
        () => form.reset(),
        () => undefined, // The mutation hook displays the server error and keeps the form values.
      );
    },
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={event => {
        event.preventDefault();
        event.stopPropagation();
        if (!pending) void form.handleSubmit();
      }}
    >
      <form.Field
        name="label"
        validators={{
          onChange: ({ value }) =>
            zTeamBookmarkRequest.shape.label.safeParse(value).error?.issues[0]?.message,
          onSubmit: ({ value }) =>
            zTeamBookmarkRequest.shape.label.safeParse(value).error?.issues[0]?.message,
        }}
      >
        {field => (
          <div className="space-y-1">
            <Label htmlFor="team-bookmark-label">Label</Label>
            <Input
              id="team-bookmark-label"
              value={field.state.value}
              onChange={event => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              placeholder="Team Discord"
              maxLength={100}
              disabled={pending}
              aria-invalid={!field.state.meta.isValid}
            />
            <FormFieldError meta={field.state.meta} />
          </div>
        )}
      </form.Field>
      <form.Field
        name="url"
        validators={{
          onChange: ({ value }) =>
            zTeamBookmarkRequest.shape.url.safeParse(value).error?.issues[0]?.message,
          onSubmit: ({ value }) =>
            zTeamBookmarkRequest.shape.url.safeParse(value).error?.issues[0]?.message,
        }}
      >
        {field => (
          <div className="space-y-1">
            <Label htmlFor="team-bookmark-url">URL</Label>
            <Input
              id="team-bookmark-url"
              type="url"
              value={field.state.value}
              onChange={event => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              placeholder="https://discord.gg/..."
              maxLength={2048}
              disabled={pending}
              aria-invalid={!field.state.meta.isValid}
              aria-describedby="team-bookmark-url-help"
            />
            <FormFieldError meta={field.state.meta} />
            <p id="team-bookmark-url-help" className="text-xs text-muted-foreground">
              Use a full link starting with http:// or https://.
            </p>
          </div>
        )}
      </form.Field>
      <div className="flex gap-2">
        <form.Subscribe<boolean> selector={state => state.canSubmit}>
          {canSubmit => (
            <Button type="submit" disabled={pending || !canSubmit}>
              {pending ? 'Saving...' : bookmark ? 'Save bookmark' : 'Add bookmark'}
            </Button>
          )}
        </form.Subscribe>
        {bookmark && (
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            Cancel edit
          </Button>
        )}
      </div>
    </form>
  );
}
