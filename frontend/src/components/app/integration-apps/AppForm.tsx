import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import {
  integrationAppSchema,
  integrationAppScopes,
  integrationAppScopeDescriptions,
  type IntegrationAppInput,
  type IntegrationAppSummary,
} from '../../../../../shared/types/integrationApp.ts';

export function AppForm({
  app,
  pending,
  onSave,
  onCancel,
}: {
  app?: IntegrationAppSummary;
  pending: boolean;
  onSave: (input: IntegrationAppInput) => Promise<void>;
  onCancel: () => void;
}) {
  const form = useForm({
    defaultValues: {
      name: app?.name ?? '',
      description: app?.description ?? '',
      redirectUris: app?.redirectUris.join('\n') ?? '',
      scopes:
        app?.scopes ?? (['profile:read', 'game-results:write'] as IntegrationAppInput['scopes']),
    },
    onSubmit: async ({ value }) => {
      await onSave(
        integrationAppSchema.parse({
          ...value,
          redirectUris: value.redirectUris
            .split('\n')
            .map(uri => uri.trim())
            .filter(Boolean),
        }),
      );
    },
  });
  return (
    <form
      className="space-y-4 rounded-lg border p-4"
      onSubmit={event => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <h3 className="text-lg! font-semibold">{app ? 'Edit app' : 'Register app'}</h3>
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) =>
            integrationAppSchema.shape.name.safeParse(value).error?.issues[0]?.message,
        }}
      >
        {field => (
          <div className="space-y-2">
            <Label htmlFor="app-name">App name</Label>
            <Input
              id="app-name"
              maxLength={80}
              required
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={event => field.handleChange(event.target.value)}
              disabled={pending}
            />
            <FormFieldError meta={field.state.meta} />
          </div>
        )}
      </form.Field>
      <form.Field name="description">
        {field => (
          <div className="space-y-2">
            <Label htmlFor="app-description">Description</Label>
            <Textarea
              id="app-description"
              maxLength={500}
              value={field.state.value}
              onChange={event => field.handleChange(event.target.value)}
              disabled={pending}
            />
          </div>
        )}
      </form.Field>
      <div className="space-y-2 text-sm">
        <p className="font-medium">Server — uses a client secret</p>
        <p className="text-muted-foreground">Keep your client secret on your backend.</p>
      </div>
      <form.Field
        name="redirectUris"
        validators={{
          onChange: ({ value }) =>
            integrationAppSchema.shape.redirectUris.safeParse(
              value
                .split('\n')
                .map(uri => uri.trim())
                .filter(Boolean),
            ).error?.issues[0]?.message,
        }}
      >
        {field => (
          <div className="space-y-2">
            <Label htmlFor="app-callbacks">Callback URLs</Label>
            <Textarea
              id="app-callbacks"
              placeholder="https://your-app.example/callback"
              required
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={event => field.handleChange(event.target.value)}
              disabled={pending}
            />
            <p className="text-sm text-muted-foreground">
              One exact URL per line. HTTPS is required, except for local HTTP callbacks. Include
              the port and path.
            </p>
            <FormFieldError meta={field.state.meta} />
          </div>
        )}
      </form.Field>
      <form.Field
        name="scopes"
        validators={{
          onChange: ({ value }) => (value.length ? undefined : 'Select at least one permission.'),
        }}
      >
        {field => (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Permissions your app can request</legend>
            {integrationAppScopes.map(scope => (
              <label key={scope} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={field.state.value.includes(scope)}
                  disabled={pending}
                  onChange={event =>
                    field.handleChange(
                      event.target.checked
                        ? [...field.state.value, scope]
                        : field.state.value.filter(item => item !== scope),
                    )
                  }
                />
                <span>{integrationAppScopeDescriptions[scope]}</span>
              </label>
            ))}
            <FormFieldError meta={field.state.meta} />
          </fieldset>
        )}
      </form.Field>
      {app && (
        <p className="text-sm text-muted-foreground">
          Changing this registration disconnects existing users. They will need to approve access
          again. Saving without changes keeps their connections.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <form.Subscribe selector={state => state.canSubmit}>
          {canSubmit => (
            <Button type="submit" disabled={!canSubmit || pending}>
              {pending ? 'Saving…' : app ? 'Save app' : 'Create app'}
            </Button>
          )}
        </form.Subscribe>
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
