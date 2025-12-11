import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { TCGCSV_GROUPS_LOCAL_STORAGE_KEY } from '../../../../../../../shared/consts/constants.ts';

type TCGPlayerGroup = {
  groupId: number;
  name: string;
  abbreviation?: string | null;
};

export type TCGPlayerGroupSelectProps = {
  showFullName?: boolean;
  forcedGroupList?: TCGPlayerGroup[];
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

const TCGPlayerGroupSelect: React.FC<TCGPlayerGroupSelectProps> = ({
  onChange,
  value,
  emptyOption,
  showFullName = false,
  forcedGroupList,
}) => {
  const parsedGroups: TCGPlayerGroup[] | null = useMemo(() => {
    if (forcedGroupList) return forcedGroupList;
    try {
      const raw = localStorage.getItem(TCGCSV_GROUPS_LOCAL_STORAGE_KEY);
      if (!raw) return null;
      const json = JSON.parse(raw);
      const results = Array.isArray(json?.results) ? json.results : null;
      if (!results) return null;
      return results.map((g: any) => ({
        groupId: Number(g.groupId),
        name: String(g.name ?? ''),
        abbreviation: g.abbreviation ?? null,
      }));
    } catch (e) {
      console.warn('Failed to parse TCGplayer groups from localStorage', e);
      return null;
    }
  }, [forcedGroupList]);

  const hasData = !!(parsedGroups && parsedGroups.length > 0);

  const [selected, setSelected] = React.useState<string | 'empty'>(
    value == null ? 'empty' : String(value),
  );

  useEffect(() => setSelected(value == null ? 'empty' : String(value)), [value]);

  const onChangeHandler = useCallback(
    (v: string | 'empty') => {
      if (!emptyOption && v === 'empty') {
        throw new Error('Empty option is not allowed');
      }
      if (v === 'empty' && emptyOption) {
        setSelected('empty');
        onChange(null as any);
      } else if (v !== 'empty') {
        const id = Number(v);
        onChange(id as any);
        setSelected(String(id));
      }
    },
    [onChange],
  );

  // When there is no data in storage, disable the select and show a single warning option
  const disabled = !hasData;
  const warningText = 'No TCGplayer groups in storage — refresh first';

  return (
    <Select value={selected ?? undefined} onValueChange={onChangeHandler} disabled={disabled}>
      <SelectTrigger disabled={disabled}>
        <SelectValue placeholder={disabled ? 'No groups' : 'Group'} />
      </SelectTrigger>
      <SelectContent>
        {disabled ? (
          <SelectItem value="empty" disabled>
            {warningText}
          </SelectItem>
        ) : (
          <>
            {emptyOption && (
              <SelectItem value="empty">{showFullName ? '- no group -' : '-'}</SelectItem>
            )}
            {parsedGroups!.map(g => (
              <SelectItem key={g.groupId} value={String(g.groupId)}>
                {showFullName ? (
                  <div className="flex gap-2 grow justify-between">
                    <span>{g.name}</span>
                    <span>[{(g.abbreviation || String(g.groupId)).toString().toUpperCase()}]</span>
                  </div>
                ) : (
                  (g.abbreviation || String(g.groupId)).toString().toUpperCase()
                )}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
};

export default TCGPlayerGroupSelect;
