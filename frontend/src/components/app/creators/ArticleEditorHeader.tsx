import { ImagePlus } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import type { CreationDocument } from '../../../../../shared/creators/contracts.ts';
import { ArticleHeader, articleSummary } from './ArticleHeader.tsx';
import { ImageField } from './ImageField.tsx';
import { creatorTitle } from './creatorStyles.ts';

function ArticleTextField({
  label,
  value,
  placeholder,
  maxLength,
  className,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  className: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    const resize = () => {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight}px`;
    };
    resize();
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width === element.clientWidth) return;
      width = element.clientWidth;
      resize();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);
  return (
    <div className={`min-w-0 ${className}`}>
      <Textarea
        ref={input}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={1}
        onChange={event => onChange(event.target.value)}
        className="min-h-0 scroll-mt-56 resize-none overflow-hidden rounded-sm border-0 bg-transparent p-0 placeholder:opacity-70 focus-visible:ring-offset-4 sm:scroll-mt-28"
        style={{ font: 'inherit', letterSpacing: 'inherit' }}
      />
    </div>
  );
}

export function ArticleEditorHeader({
  document,
  update,
}: {
  document: CreationDocument;
  update: (patch: Partial<CreationDocument>) => void;
}) {
  return (
    <ArticleHeader
      coverUrl={document.coverUrl}
      tags={document.tags}
      coverControl={
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="absolute inset-0 rounded-t-[19px] text-left transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="absolute top-5 right-5 inline-flex items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs font-medium shadow-sm sm:right-8 lg:right-10">
                <ImagePlus className="size-4" aria-hidden="true" />
                {document.coverUrl ? 'Change cover image' : 'Add cover image'}
              </span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Article cover</DialogTitle>
              <DialogDescription>
                Choose an image to display behind your article title and summary.
              </DialogDescription>
            </DialogHeader>
            <ImageField
              label="Cover image"
              value={document.coverUrl}
              onChange={coverUrl => update({ coverUrl })}
            />
            <div className="flex justify-between gap-3">
              <Button
                variant="ghost"
                disabled={!document.coverUrl}
                onClick={() => update({ coverUrl: '' })}
              >
                Remove cover
              </Button>
              <DialogClose asChild>
                <Button>Done</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      }
      title={
        <ArticleTextField
          label="Title"
          value={document.title}
          placeholder="Your article title"
          maxLength={200}
          className={creatorTitle}
          onChange={title => update({ title: title.replace(/\r?\n/g, ' ') })}
        />
      }
      summary={
        <ArticleTextField
          label="Summary"
          value={document.summary}
          placeholder="Add a short summary…"
          maxLength={1000}
          className={articleSummary}
          onChange={summary => update({ summary })}
        />
      }
    />
  );
}
