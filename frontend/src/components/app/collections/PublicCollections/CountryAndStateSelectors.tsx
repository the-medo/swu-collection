import * as React from 'react';
import CountrySelector from '@/components/app/global/CountrySelector.tsx';
import CountryStateSelector from '@/components/app/global/CountryStateSelector.tsx';
import { useCallback } from 'react';
import { CountryCode } from '../../../../../../server/db/lists.ts';
import {
  usePublicCollectionsStore,
  usePublicCollectionsStoreActions,
} from '@/components/app/collections/PublicCollections/usePublicCollectionsStore.ts';

interface CountryAndStateSelectorsProps {}

const CountryAndStateSelectors: React.FC<CountryAndStateSelectorsProps> = () => {
  const { country, state } = usePublicCollectionsStore();
  const { setCountry, setState } = usePublicCollectionsStoreActions();

  const onChangeCountry = useCallback((c: CountryCode | null) => {
    setCountry(c);
    setState(null);
  }, []);

  const onChangeState = useCallback((s: string | null) => setState(s), []);

  return (
    <>
      <CountrySelector value={country} onChangeCountry={onChangeCountry} />
      {country && (
        <CountryStateSelector
          countryCode={country}
          value={state}
          onChangeCountryState={onChangeState}
        />
      )}
    </>
  );
};

export default CountryAndStateSelectors;
