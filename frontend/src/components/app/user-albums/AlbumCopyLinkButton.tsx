import { useEffect, useId, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';

export function AlbumCopyLinkButton({
  id,
  title,
  isPrivate,
}: {
  id: string;
  title: string;
  isPrivate: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);
  const inputId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const url = new URL(`/albums/${id}`, window.location.origin).href;
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <>
      <Button
        ref={trigger}
        aria-label={`Copy link to ${title}`}
        variant="outline"
        size="sm"
        className="min-w-28 flex-1 rounded-xl border-border bg-transparent text-xs"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            setCopied(false);
            setFallback(true);
          }
        }}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? 'Copied' : 'Copy link'}
      </Button>
      <span role="status" className="sr-only">
        {copied
          ? `Album link copied.${isPrivate ? ' Only you can open this private album.' : ''}`
          : ''}
      </span>
      <Dialog open={fallback} onOpenChange={setFallback}>
        <DialogContent
          className="rounded-2xl"
          onCloseAutoFocus={event => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Copy album link</DialogTitle>
            <DialogDescription>
              Your browser couldn’t copy automatically. Select the link below to copy it.
              {isPrivate && ' Only you can open this private album.'}
            </DialogDescription>
          </DialogHeader>
          <label htmlFor={inputId} className="sr-only">
            Album link
          </label>
          <Input
            id={inputId}
            readOnly
            value={url}
            onFocus={event => event.currentTarget.select()}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
