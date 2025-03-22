import * as React from 'react';
import CountrySelector from '@/components/app/global/CountrySelector.tsx';
import CountryStateSelector from '@/components/app/global/CountryStateSelector.tsx';
import { useCallback, useState } from 'react';
import { CountryCode } from '../../../../../../server/db/lists.ts';
import { usePublicCollectionsStoreActions } from '@/components/app/collections/PublicCollections/usePublicCollectionsStore.ts';
import { Card, CardHeader } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';

interface CountryAndStateSelectorsProps {}

const CountryAndStateSelectors: React.FC<CountryAndStateSelectorsProps> = () => {
  const [country, setCountry] = useState<CountryCode | null>();
  const [state, setState] = useState<string | null>();
  const { setCountry: setStoreCountry, setState: setStoreState } =
    usePublicCollectionsStoreActions();

  const onChangeCountry = useCallback((c: CountryCode | null) => {
    setCountry(c);
    setState(null);
  }, []);

  const onChangeState = useCallback((s: string | null) => setState(s), []);

  const onSubmit = useCallback(() => {
    setTimeout(() => {
      setStoreCountry(country ?? null);
      setStoreState(state ?? null);
    }, 100);
  }, [country, state]);

  return (
    <Card className="fixed bottom-4 right-4">
      <CardHeader className="p-2">
        <CountrySelector value={country} onChangeCountry={onChangeCountry} />
        {country && (
          <CountryStateSelector
            countryCode={country}
            value={state}
            onChangeCountryState={onChangeState}
          />
        )}
        <Button onClick={onSubmit} className="btn btn-primary">
          Submit
        </Button>
      </CardHeader>
    </Card>
  );
};

export default CountryAndStateSelectors;
