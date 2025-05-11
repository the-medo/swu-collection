import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import * as React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { MetaQueryParams, useGetMetas } from '@/api/meta/useGetMetas.ts';

export type MetaSelectorProps = {
  showFormat?: boolean;
  queryParams?: MetaQueryParams;
  formatId?: number;
} & (
  | {
      value: number;
      emptyOption: false;
      onChange: (v: number) => void;
    }
  | {
      value: number | null;
      emptyOption: true;
      onChange: (v: number | null) => void;
      allowClear?: boolean;
    }
);

const MetaSelector: React.FC<MetaSelectorProps> = ({
  onChange,
  value,
  emptyOption,
  showFormat = true,
  queryParams = {},
  formatId,
}) => {
  const { data: metasResponse, isLoading } = useGetMetas(queryParams);

  const metas = useMemo(
    () =>
      (formatId
        ? metasResponse?.data.filter(f => f.format.id === formatId)
        : metasResponse?.data) || [],
    [metasResponse, formatId],
  );

  const [selectedMeta, setSelectedMeta] = React.useState<number | 'empty'>(value ?? 'empty');

  useEffect(() => {
    setSelectedMeta(value ?? 'empty');
  }, [value]);

  const onChangeHandler = useCallback(
    (v: string) => {
      const metaId = v === 'empty' ? 'empty' : parseInt(v);

      if (!emptyOption && metaId === 'empty') {
        throw new Error('Empty option is not allowed');
      }

      if (metaId === 'empty' && emptyOption) {
        setSelectedMeta('empty');
        onChange(null);
      } else if (metaId !== 'empty') {
        onChange(metaId);
        setSelectedMeta(metaId);
      }
    },
    [onChange, emptyOption],
  );

  return (
    <Select
      value={selectedMeta === 'empty' ? 'empty' : selectedMeta.toString()}
      onValueChange={onChangeHandler}
      disabled={isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select Meta" />
      </SelectTrigger>
      <SelectContent>
        {emptyOption && <SelectItem value="empty">- No Meta -</SelectItem>}
        {metas.map(meta => (
          <SelectItem key={meta.meta.id} value={meta.meta.id.toString()}>
            <div className="flex gap-2 flex-grow justify-between">
              <span>{meta.meta.name}</span>
              {showFormat && (
                <span className="text-muted-foreground">
                  [{meta.format.name} - {meta.meta.set.toUpperCase()} S{meta.meta.season}]
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default MetaSelector;
