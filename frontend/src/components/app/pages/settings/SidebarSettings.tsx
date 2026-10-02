import { useForm } from '@tanstack/react-form';
import { useSidebarSettings, useSetSidebarSettings } from '@/api/user/useSidebarSettings.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import {
  getDefaultSettingValue,
  sidebarTournamentDaysSchema,
  sidebarTournamentMaxDays,
  sidebarSettingsSchema,
  type SidebarSettingsValues,
} from '../../../../../../shared/lib/userSettings.ts';

export default function SidebarSettings() {
  const user = useUser();
  const query = useSidebarSettings();
  if (!user) return null;
  if (query.isPending) return <p role="status">Loading sidebar settings…</p>;
  if (query.isError)
    return (
      <div role="alert">
        {query.error.message}{' '}
        <Button variant="link" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  return <SidebarSettingsForm key={user.id} userId={user.id} saved={query.data} />;
}

function SidebarSettingsForm({ userId, saved }: { userId: string; saved: SidebarSettingsValues }) {
  const mutation = useSetSidebarSettings();
  const form = useForm({
    defaultValues: {
      left_sidebar_collections_and_lists: saved.left_sidebar_collections_and_lists,
      left_sidebar_my_tournaments: saved.left_sidebar_my_tournaments,
      left_sidebar_my_tournaments_days_before: String(
        saved.left_sidebar_my_tournaments_days_before,
      ),
      left_sidebar_my_tournaments_days_after: String(saved.left_sidebar_my_tournaments_days_after),
    },
    onSubmit: async ({ value, formApi }) => {
      const parsed = sidebarSettingsSchema.safeParse(value);
      if (!parsed.success) return;
      try {
        await mutation.mutateAsync({ userId, settings: parsed.data });
        formApi.reset(value);
      } catch {
        // The mutation error is displayed below; keep the draft available for retry.
      }
    },
  });
  return (
    <form
      className="space-y-4"
      onSubmit={event => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <p className="text-sm text-muted-foreground">
        Choose which sections appear in the left sidebar. The tournament date window moves with
        today and includes events that span multiple days.
      </p>
      <fieldset className="space-y-4" disabled={mutation.isPending}>
        <form.Field name="left_sidebar_collections_and_lists">
          {field => (
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor={field.name}>Show collections and lists in the left sidebar</Label>
              <Switch
                id={field.name}
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="left_sidebar_my_tournaments">
          {field => (
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor={field.name}>Show my tournaments in the left sidebar</Label>
              <Switch
                id={field.name}
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['left_sidebar_my_tournaments_days_before', 'Days before today'],
              ['left_sidebar_my_tournaments_days_after', 'Days after today'],
            ] as const
          ).map(([name, label]) => (
            <form.Field
              key={name}
              name={name}
              validators={{
                onChange: ({ value }) =>
                  sidebarTournamentDaysSchema.safeParse(value).success
                    ? undefined
                    : `Enter a whole number from 0 to ${sidebarTournamentMaxDays}.`,
              }}
            >
              {field => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>{label}</Label>
                  <Input
                    id={field.name}
                    type="number"
                    min={0}
                    max={sidebarTournamentMaxDays}
                    step={1}
                    required
                    value={field.state.value}
                    onChange={event => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                    aria-describedby={`${name}-hint ${name}-error`}
                  />
                  <p id={`${name}-hint`} className="text-xs text-muted-foreground">
                    Default: {getDefaultSettingValue(name)} days. Use 0 for today only on this side
                    of the window.
                  </p>
                  <div id={`${name}-error`}>
                    <FormFieldError meta={field.state.meta} />
                  </div>
                </div>
              )}
            </form.Field>
          ))}
        </div>
        <form.Subscribe selector={state => [state.canSubmit, state.isPristine, state.isSubmitting]}>
          {([canSubmit, isPristine, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isPristine || isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save sidebar settings'}
            </Button>
          )}
        </form.Subscribe>
      </fieldset>
      {mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="text-sm text-muted-foreground">
          Sidebar settings saved.
        </p>
      )}
    </form>
  );
}
