import { useId, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { creatorLanguages, languageInfo } from '../../../../../shared/creators/languages.ts';

export function LanguageFlag({ code }: { code: string }) {
  const { flag, label } = languageInfo(code);
  return (
    <span role="img" aria-label={label} title={label} className="text-xl leading-none">
      {flag}
    </span>
  );
}

const flagButton =
  'flex h-10 min-w-10 items-center justify-center rounded-lg border px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const selectedClass =
  'border-[var(--creator-border)] bg-[var(--creator-soft)] text-[var(--creator-accent)]';

export function LanguageFilter({
  available,
  value,
  onChange,
}: {
  available: string[];
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-[12px] font-semibold">Language</legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={!value}
          className={`${flagButton} text-xs ${!value ? selectedClass : 'border-border hover:bg-muted'}`}
          onClick={() => onChange(undefined)}
        >
          All languages
        </button>
        {available.map(code => {
          const info = languageInfo(code),
            selected = code.toLowerCase() === value?.toLowerCase();
          return (
            <button
              type="button"
              key={code}
              title={info.label}
              aria-label={info.label}
              aria-pressed={selected}
              className={`${flagButton} ${selected ? selectedClass : 'border-border hover:bg-muted'}`}
              onClick={() => onChange(selected ? undefined : code)}
            >
              <LanguageFlag code={code} />
            </button>
          );
        })}
      </div>
      {value && !available.some(code => code.toLowerCase() === value.toLowerCase()) && (
        <button type="button" className="text-xs underline" onClick={() => onChange(undefined)}>
          Clear {languageInfo(value).label} filter
        </button>
      )}
    </fieldset>
  );
}

export function LanguagePicker({
  selected,
  onChange,
  multiple = false,
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
  multiple?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('');
  const values = [...new Set(selected.map(code => languageInfo(code).code))];
  const choices = [...new Set([...creatorLanguages, ...values].map(code => languageInfo(code).code))]
    .map(languageInfo)
    .filter(info => `${info.code} ${info.label}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label));
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-[12px] font-medium">
        {multiple ? 'Languages' : 'Language'}
      </label>
      <Popover
        open={open}
        onOpenChange={next => {
          setOpen(next);
          setSearch('');
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            aria-label={multiple ? 'Choose languages' : 'Choose language'}
            aria-describedby={`${id}-selection`}
            className="h-auto min-h-10 w-full justify-between gap-2 whitespace-normal"
          >
            <span id={`${id}-selection`} className="flex flex-wrap items-center gap-2">
              {values.length
                ? values.map(code => (
                    <span key={code} className="inline-flex items-center gap-1.5">
                      <LanguageFlag code={code} />
                      <span className="text-xs">{languageInfo(code).label}</span>
                    </span>
                  ))
                : 'Choose languages'}
            </span>
            <ChevronDown size={14} className="shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] space-y-3">
          <Input
            aria-label="Search languages"
            placeholder="Search languages…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div
            className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto p-1"
            role="group"
            aria-label="Languages"
          >
            {choices.map(info => {
              const checked = values.includes(info.code);
              return (
                <button
                  type="button"
                  key={info.code}
                  title={info.label}
                  aria-label={info.label}
                  aria-pressed={checked}
                  disabled={multiple && !checked && values.length >= 10}
                  className={`${flagButton} relative h-auto! min-h-10 justify-start! gap-2 text-left disabled:opacity-40 ${checked ? selectedClass : 'border-border hover:bg-muted'}`}
                  onClick={() => {
                    onChange(
                      multiple
                        ? checked
                          ? values.filter(code => code !== info.code)
                          : [...values, info.code]
                        : [info.code],
                    );
                    if (!multiple) setOpen(false);
                  }}
                >
                  <LanguageFlag code={info.code} />
                  <span className="text-[11px] leading-tight">{info.label}</span>
                  {checked && (
                    <Check size={10} className="absolute right-0 top-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
          {!choices.length && (
            <p className="text-xs text-muted-foreground">No matching languages.</p>
          )}
          {multiple && <p className="text-xs text-muted-foreground">Choose up to 10 languages.</p>}
        </PopoverContent>
      </Popover>
    </div>
  );
}
