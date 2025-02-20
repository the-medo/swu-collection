import * as React from 'react';
import { useEffect } from 'react';
import debounce from 'lodash.debounce';
import {
  useCollectionFilterStore,
  useCollectionFilterStoreActions,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionFilterStore.ts';
import { Input } from '@/components/ui/input.tsx';

const DEBOUNCE_DELAY = 250;

interface CollectionFilterInputProps {}

const CollectionFilterInput: React.FC<CollectionFilterInputProps> = () => {
  const { search } = useCollectionFilterStore();
  const { setSearch } = useCollectionFilterStoreActions();
  const [inputValue, setInputValue] = React.useState<string>(search);

  useEffect(() => {
    setInputValue(search);
  }, [search]);

  const debouncedOnChange = React.useMemo(
    () =>
      debounce((value: string) => {
        setSearch(value);
      }, DEBOUNCE_DELAY),
    [setSearch],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    debouncedOnChange(newValue);
  };

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  return (
    <Input className="w-full" placeholder="Search..." value={inputValue} onChange={handleChange} />
  );
};

export default CollectionFilterInput;
