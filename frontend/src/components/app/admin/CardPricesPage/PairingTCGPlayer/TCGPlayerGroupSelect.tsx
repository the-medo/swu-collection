import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { useGetTcgPlayerGroups } from '@/api/card-prices';

type TCGPlayerGroup = ReturnType<typeof useGetTcgPlayerGroups>['data'] extends
  | (infer T)[]
  | undefined
  ? T
  : never;

export type TCGPlayerGroupSelectProps = {
  showFullName?: boolean;
  forcedGroupList?: TCGPlayerGroup[];
  value: number | null;
  emptyOption: boolean;
  onChange: (value: number | null) => void;
};

const TCGPlayerGroupSelect: React.FC<TCGPlayerGroupSelectProps> = ({
  onChange,
  value,
  emptyOption,
  showFullName = false,
  forcedGroupList,
}) => {
  const { data } = useGetTcgPlayerGroups();
  const parsedGroups = forcedGroupList ?? data;

  const hasData = !!(parsedGroups && parsedGroups.length > 0);

  const selected = value == null ? 'empty' : String(value);

  const onChangeHandler = (nextValue: string) => {
    if (nextValue === 'empty') {
      if (!emptyOption) throw new Error('Empty option is not allowed');
      onChange(null);
      return;
    }

    onChange(Number(nextValue));
  };

  // When the query has no data, disable the select and show a single warning option.
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
