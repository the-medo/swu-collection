import * as React from 'react';
import { useCountryList } from '@/api/lists/useCountryList.ts';
import { CountryCode } from '../../../../../server/db/lists.ts';
import { cn } from '@/lib/utils.ts';

interface FlagProps {
  countryCode: CountryCode;
  className?: string;
}

const Flag: React.FC<FlagProps> = ({ countryCode, className }) => {
  const { data: countryData } = useCountryList();
  const country = countryData?.countries[countryCode];

  if (!country) {
    return null;
  }

  // Replace "og_" with "small_" in the flag URL
  const flagUrl = country.flag.replace('og_', 'small_');

  return (
    <img src={flagUrl} alt={country.code} className={cn('w-4', className)} title={country.name} />
  );
};

export default Flag;
