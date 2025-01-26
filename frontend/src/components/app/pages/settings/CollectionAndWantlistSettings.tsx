import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useCallback } from 'react';
import { authClient } from '@/lib/auth-client.ts';
import { Label } from '@/components/ui/label.tsx';
import CurrencySelector from '@/components/app/global/CurrencySelector.tsx';
import CountrySelector from '@/components/app/global/CountrySelector.tsx';
import CountryStateSelector from '@/components/app/global/CountryStateSelector.tsx';
import { CountryCode, CurrencyCode } from '../../../../../../server/db/lists.ts';

export interface CollectionAndWantlistSettingsProps {}

const CollectionAndWantlistSettings: React.FC<CollectionAndWantlistSettingsProps> = ({}) => {
  const user = useUser();
  const { toast } = useToast();

  const onCountryChange = useCallback(async (c: CountryCode | null) => {
    try {
      const { error } = await authClient.updateUser({ country: c, state: null });
      if (!error) {
        toast({
          title: c === null ? `Country cleared` : `Country set to ${c}`,
        });
      } else {
        throw new Error(error.statusText);
      }
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error while updating country',
        description: (e as Error).toString(),
      });
    }
  }, []);

  const onCountryStateChange = useCallback(async (c: string | null) => {
    try {
      const { error } = await authClient.updateUser({ state: c });
      if (!error) {
        toast({
          title: c === null ? `State / region cleared` : `State / region set to ${c}`,
        });
      } else {
        throw new Error(error.statusText);
      }
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error while updating state / region',
        description: (e as Error).toString(),
      });
    }
  }, []);

  const onCurrencyChange = useCallback(async (c: CurrencyCode | null) => {
    if (!c) return;
    try {
      // @ts-ignore -- currency exists on User type, no idea why TS thinks it doesn't
      const { error } = await authClient.updateUser({ currency: c });
      if (!error) {
        toast({
          title: `Currency set to ${c}`,
        });
      } else {
        throw new Error(error.statusText);
      }
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error while updating currency',
        description: (e as Error).toString(),
      });
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
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
  );
};

export default CollectionAndWantlistSettings;
