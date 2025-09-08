import React, { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Image as ImageIcon } from 'lucide-react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting';
import { useSetUserSetting } from '@/api/user/useSetUserSetting';
import { cn } from '@/lib/utils.ts';

export interface ExportWidthSelectorProps {
  value?: number;
  onChange?: (value: number) => void;
  fullWidth?: boolean;
}

const options: { value: number; label: string; desc: string }[] = [
  { value: 1200, label: '1200px', desc: 'smallest filesize, cards unreadable' },
  { value: 1920, label: '1920px', desc: 'small filesize, cards still unreadable for most part' },
  {
    value: 2200,
    label: '2200px',
    desc: 'medium filesize, cards readable but not clear (recommended)',
  },
  { value: 2800, label: '2800px', desc: 'big filesize, cards readable' },
];

const ExportWidthSelector: React.FC<ExportWidthSelectorProps> = ({
  value,
  onChange,
  fullWidth = false,
}) => {
  const { data: storeValue } = useGetUserSetting('deckImage_exportWidth');
  const { mutate: setSetting } = useSetUserSetting('deckImage_exportWidth');

  const selected = value !== undefined ? value : storeValue;
  const selectedLabel = useMemo(
    () => options.find(o => o.value === selected)?.label ?? '2200px',
    [selected],
  );

  const onValueChange = useCallback(
    (v: string) => {
      const newValue = parseInt(v, 10);
      if (onChange) {
        onChange(newValue);
      } else {
        setSetting(newValue);
      }
    },
    [onChange],
  );

  return (
    <DropdownMenu modal={true}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn('text-xs justify-between', fullWidth ? 'w-full' : 'w-[220px]')}
        >
          <span className="text-[1.2em] font-semibold">Export width:</span> {selectedLabel}
          <ImageIcon className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[220px] max-w-[300px]">
        <DropdownMenuRadioGroup value={String(selected)} onValueChange={onValueChange}>
          {options.map(o => (
            <DropdownMenuRadioItem key={o.value} value={String(o.value)} className="py-2">
              <div className="flex items-center gap-3">
                <div className="text-base font-semibold w-[64px] max-w-[64px] text-right">
                  {o.value}px
                </div>
                <div className="text-xs opacity-80 flex flex-1">{o.desc}</div>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportWidthSelector;
