import { createFileRoute } from '@tanstack/react-router';
import CountrySelector from '@/components/app/global/CountrySelector.tsx';
import { useCallback } from 'react';
import { CountryCode } from '../../../server/db/lists.ts';
import { authClient } from '@/lib/auth-client.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Label } from '@/components/ui/label.tsx';
import CountryStateSelector from '@/components/app/global/CountryStateSelector.tsx';

export const Route = createFileRoute('/_authenticated/settings')({
  component: RouteComponent,
});

function RouteComponent() {
  const user = useUser();

  const onCountryChange = useCallback(async (c: CountryCode | null) => {
    await authClient.updateUser({ country: c, state: null });
  }, []);

  const onStateChange = useCallback(async (c: string | null) => {
    await authClient.updateUser({ state: c });
  }, []);

  return (
    <div className="p-2">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl">Settings</h2>
        <div className="flex flex-col gap-2">
          <Label>Country</Label>
          <CountrySelector onChangeCountry={onCountryChange} value={user?.country} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>State / region</Label>
          {user?.country ? (
            <CountryStateSelector
              countryCode={user.country}
              onChangeCountryState={onStateChange}
              value={user?.state}
            />
          ) : (
            <span>Select a country before selecting a state / region</span>
          )}
        </div>
        <ul className="ml-4 list-disc list-inside text-sm text-gray-700">
          <li>both country and state/region are optional</li>
          <li>all your collections are assigned this country and state/region</li>
          <li>country and state/region are used for default filtering of public collections</li>
        </ul>
      </div>
    </div>
  );
}
