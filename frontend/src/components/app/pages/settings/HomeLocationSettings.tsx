import { useForm } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { useHomeLocation, useSaveHomeLocation } from '@/api/user/useHomeLocation.ts';
import { useCountryList } from '@/api/lists/useCountryList.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  homeLocationInputSchema,
  type HomeLocation,
} from '../../../../../../shared/lib/userHomeLocation.ts';

export default function HomeLocationSettings() {
  const user = useUser();
  const query = useHomeLocation();
  if (!user) return null;
  if (query.isPending) return <p role="status">Loading home location…</p>;
  if (query.isError)
    return (
      <div role="alert">
        {query.error.message}{' '}
        <Button variant="link" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  return (
    <HomeLocationForm
      key={`${user.id}:${query.data?.updatedAt ?? 'empty'}`}
      userId={user.id}
      country={user.country ?? ''}
      saved={query.data}
    />
  );
}

function HomeLocationForm({
  userId,
  country,
  saved,
}: {
  userId: string;
  country: string;
  saved: HomeLocation | null;
}) {
  const mutation = useSaveHomeLocation();
  const countries = useCountryList();
  const form = useForm({
    defaultValues: saved?.input ?? { address: '', city: '', state: '', postalCode: '', country },
    onSubmit: async ({ value }) => {
      const parsed = homeLocationInputSchema.safeParse(value);
      if (!parsed.success) return;
      await mutation.mutateAsync({ userId, location: parsed.data }).catch(() => undefined);
    },
  });
  const fields = [
    {
      key: 'address',
      label: 'Street address (optional)',
      autoComplete: 'street-address',
      maxLength: 250,
    },
    { key: 'city', label: 'City', autoComplete: 'address-level2', maxLength: 150 },
    {
      key: 'state',
      label: 'State / region (optional)',
      autoComplete: 'address-level1',
      maxLength: 150,
    },
    {
      key: 'postalCode',
      label: 'Postal code (optional)',
      autoComplete: 'postal-code',
      maxLength: 30,
    },
  ] as const;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Show your home on the tournament map. Only you can see it. A city and country are enough;
          add a street address for a more precise location.
        </p>
        <p className="text-xs text-muted-foreground">
          Saving sends this location to Geoapify to find its coordinates.
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={event => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <fieldset disabled={mutation.isPending} className="grid gap-4 sm:grid-cols-2">
          {fields.map(({ key, label, autoComplete, maxLength }) => (
            <form.Field
              key={key}
              name={key}
              validators={{
                onBlur: ({ value }) =>
                  key === 'city' && !value.trim() ? 'Enter a city.' : undefined,
              }}
            >
              {field => (
                <div className="space-y-1">
                  <Label htmlFor={`home-${key}`}>{label}</Label>
                  <Input
                    id={`home-${key}`}
                    value={field.state.value}
                    autoComplete={autoComplete}
                    maxLength={maxLength}
                    required={key === 'city'}
                    onBlur={field.handleBlur}
                    onChange={event => field.handleChange(event.target.value)}
                  />
                  <FormFieldError meta={field.state.meta} />
                </div>
              )}
            </form.Field>
          ))}
          <form.Field name="country">
            {field => (
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="home-country">Country</Label>
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger id="home-country">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(countries.data?.countries ?? {}).map(([code, item]) => (
                      <SelectItem key={code} value={code}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {countries.isError && (
                  <div role="alert" className="text-sm text-destructive">
                    Could not load countries.{' '}
                    <Button type="button" variant="link" onClick={() => void countries.refetch()}>
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            )}
          </form.Field>
        </fieldset>
        {mutation.error && (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error.message}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <form.Subscribe selector={state => state.values}>
            {values => (
              <Button
                type="submit"
                disabled={mutation.isPending || !homeLocationInputSchema.safeParse(values).success}
              >
                {mutation.isPending
                  ? 'Saving…'
                  : saved
                    ? 'Save and recompute'
                    : 'Save home location'}
              </Button>
            )}
          </form.Subscribe>
          {saved && (
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ userId, location: null })}
            >
              Remove home location
            </Button>
          )}
        </div>
      </form>
      {saved && (
        <div role="status" className="space-y-1 rounded-md border p-3 text-sm">
          <div className="font-medium">Saved home location</div>
          <div>{saved.formattedAddress}</div>
          {saved.precision !== 'address' && (
            <div className="text-muted-foreground">Approximate {saved.precision} location</div>
          )}
          <Link to="/tournaments/map" className="inline-block text-primary hover:underline">
            View on tournament map
          </Link>
        </div>
      )}
    </div>
  );
}
