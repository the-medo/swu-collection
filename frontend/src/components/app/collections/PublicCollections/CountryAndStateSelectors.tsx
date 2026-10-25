import { browseStyles } from '@/components/app/global/BrowsePage/browseStyles';
import { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import CountrySelector from '@/components/app/global/CountrySelector.tsx';
import CountryStateSelector from '@/components/app/global/CountryStateSelector.tsx';
import { CountryCode } from '../../../../../../server/db/lists.ts';
import {
  usePublicCollectionsStore,
  usePublicCollectionsStoreActions,
} from './usePublicCollectionsStore.ts';
import { Button } from '@/components/ui/button.tsx';

export default function CountryAndStateSelectors() {
  const applied = usePublicCollectionsStore();
  const { setCountry: applyCountry, setState: applyState } = usePublicCollectionsStoreActions();
  const [country, setCountry] = useState<CountryCode | null>(applied.country);
  const [state, setState] = useState<string | null>(applied.state);
  return (
    <form
      className={browseStyles.toolbar}
      aria-label="Filter by location"
      onSubmit={event => {
        event.preventDefault();
        applyCountry(country);
        applyState(state);
      }}
    >
      <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--browse-accent)]">
        <MapPin className="size-4" />
        Location
      </span>
      <div className="min-w-0 flex-1 basis-52" role="group" aria-label="Country">
        <CountrySelector
          value={country}
          fullWidth
          allowClear={false}
          onChangeCountry={value => {
            setCountry(value);
            setState(null);
          }}
        />
      </div>
      {country && (
        <div
          className="min-w-0 flex-1 basis-52 [&_button[role=combobox]]:w-full"
          role="group"
          aria-label="State or region"
        >
          <CountryStateSelector
            countryCode={country}
            value={state}
            onChangeCountryState={setState}
            allowClear={false}
          />
        </div>
      )}
      <Button type="submit" variant="secondary">
        Apply filters
      </Button>
      {(country || applied.country) && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setCountry(null);
            setState(null);
            applyCountry(null);
          }}
        >
          <X className="size-4" />
          Clear
        </Button>
      )}
    </form>
  );
}
