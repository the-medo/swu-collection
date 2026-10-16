import { useState, useId } from 'react';
import { Check, Plus, Lightbulb, TriangleAlert, Sparkles } from 'lucide-react';
import { InsertionView } from './InsertionView.tsx';
import { cn } from '@/lib/utils.ts';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { PickerBody, PickerFooter } from './PickerLayout.tsx';
import { Button } from '@/components/ui/button.tsx';
import { widgetSchema, type Widget } from './model.ts';

export function CalloutPicker({
  initial,
  onSelect,
}: {
  initial?: Extract<Widget, { kind: 'callout' }>;
  onSelect: (value: Widget) => void;
}) {
  const kind = 'callout';
  const fieldId = useId();
  const [title, setTitle] = useState(initial?.title ?? 'Game plan');
  const [tone, setTone] = useState<Extract<Widget, { kind: 'callout' }>['tone']>(
    initial?.tone ?? 'tip',
  );
  const [text, setText] = useState(initial?.text ?? '');
  const parsed = widgetSchema.safeParse({ kind, tone, title, text });

  const guidance = !parsed.success
    ? 'Add a title and notes to continue.'
    : initial
      ? 'Changes apply to this block when you save.'
      : 'You can edit this block again after inserting it.';
  return (
    <>
      <PickerBody>
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold">Style</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: 'tip', label: 'Tip', Icon: Lightbulb },
                { value: 'warning', label: 'Watch out', Icon: TriangleAlert },
                { value: 'key-play', label: 'Key play', Icon: Sparkles },
              ] as const
            ).map(({ value, label, Icon }) => (
              <label
                key={value}
                className={cn(
                  'relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border px-2 py-4 text-xs transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  tone === value && 'border-primary/50 bg-primary/10 font-semibold',
                )}
              >
                <input
                  type="radio"
                  name={`${fieldId}-tone`}
                  value={value}
                  checked={tone === value}
                  onChange={() => setTone(value)}
                  className="sr-only"
                />
                <Icon className="size-5" aria-hidden />
                {label}
                {tone === value && (
                  <Check
                    className="absolute right-2 top-2 size-3 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4">
          <div className="grid gap-2 text-xs font-medium">
            <label htmlFor={`${fieldId}-title`}>Title</label>
            <Input
              id={`${fieldId}-title`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Give this moment a title"
            />
          </div>
        </div>

        <div className="grid gap-2 text-xs font-medium">
          <label htmlFor={`${fieldId}-notes`}>Notes</label>
          <Textarea
            id={`${fieldId}-notes`}
            className="min-h-28 resize-y rounded-xl text-sm leading-relaxed"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="What should your reader remember?"
          />
        </div>

        <section aria-label="Callout preview" className="rounded-xl border bg-muted/20 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
          <InsertionView
            value={{
              kind: 'callout',
              tone,
              title: title || 'Your title',
              text: text || 'Your strategy will appear here as you write.',
            }}
          />
        </section>
      </PickerBody>
      <PickerFooter hint={guidance}>
        <Button
          disabled={!parsed.success}
          onClick={() => {
            if (parsed.success) onSelect(parsed.data);
          }}
        >
          {initial ? <Check aria-hidden /> : <Plus aria-hidden />}
          {initial ? 'Save changes' : 'Insert callout'}
        </Button>
      </PickerFooter>
    </>
  );
}
