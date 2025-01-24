import { createFileRoute } from '@tanstack/react-router';
import CountrySelector from '@/components/app/global/CountrySelector.tsx';
import { FocusEventHandler, useCallback } from 'react';
import { CountryCode, CurrencyCode } from '../../../server/db/lists.ts';
import { authClient } from '@/lib/auth-client.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Label } from '@/components/ui/label.tsx';
import CountryStateSelector from '@/components/app/global/CountryStateSelector.tsx';
import CurrencySelector from '@/components/app/global/CurrencySelector.tsx';
import { Input } from '@/components/ui/input.tsx';

export const Route = createFileRoute('/_authenticated/settings')({
  component: RouteComponent,
});

function RouteComponent() {
  const user = useUser();

  const onDisplayNameChange: FocusEventHandler<HTMLInputElement> = useCallback(async e => {
    if (e.target.value && e.target.value.length > 3) {
      await authClient.updateUser({ displayName: e.target.value });
    }
  }, []);

  const onCountryChange = useCallback(async (c: CountryCode | null) => {
    await authClient.updateUser({ country: c, state: null });
  }, []);

  const onCountryStateChange = useCallback(async (c: string | null) => {
    await authClient.updateUser({ state: c });
  }, []);

  const onCurrencyChange = useCallback(async (c: CurrencyCode | null) => {
    if (!c) return;
    await authClient.updateUser({ currency: c });
  }, []);

  return (
    <div className="p-2">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl">User settings</h2>
        <div className="flex flex-col gap-2">
          <Label>Display name</Label>
          <Input
            className="w-[250px]"
            type="text"
            placeholder="Display name"
            value={user?.displayName}
            onBlur={onDisplayNameChange}
            // onChange={e => field.handleChange(e.target.value)}
          />
        </div>

        <h2 className="text-2xl">Collection and wantlist settings</h2>
        <div className="flex flex-col gap-2">
          <Label>Currency</Label>
          <CurrencySelector
            onChangeCurrency={onCurrencyChange}
            value={user?.currency}
            allowClear={false}
          />
        </div>
        <ul className="ml-4 list-disc list-inside text-xs text-gray-600">
          <li>all your collections and wantlists will automatically use this currency</li>
        </ul>
        <div className="flex flex-col gap-2">
          <Label>Country</Label>
          <CountrySelector onChangeCountry={onCountryChange} value={user?.country} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>State / region</Label>
          {user?.country ? (
            <CountryStateSelector
              countryCode={user.country}
              onChangeCountryState={onCountryStateChange}
              value={user?.state}
            />
          ) : (
            <span>Select a country before selecting a state / region</span>
          )}
        </div>
        <ul className="ml-4 list-disc list-inside text-xs text-gray-600">
          <li>both country and state/region are optional</li>
          <li>all your collections and wantlists are assigned to this country and state/region</li>
          <li>
            country and state/region are used for your default filtering of public collections and
            wantlists
          </li>
        </ul>
      </div>
    </div>
  );
}
